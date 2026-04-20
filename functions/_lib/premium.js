import { getCurrentUser, json } from "./auth.js";

export const PREMIUM_PRICE_USD = 3;
export const PREMIUM_ORDER_TTL_MS = 1000 * 60 * 60 * 2;
export const VALID_COINS = ["LITECOIN", "BITCOIN", "ETHEREUM"];
const COINGECKO_SIMPLE_PRICE_URL = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,litecoin,ethereum&vs_currencies=usd";
const BLOCKCHAIR_API_ROOT = "https://api.blockchair.com";
const ORDER_COUNTER_KEY = "premium:order_counter";
const PENDING_INDEX_KEY = "premium:pending_orders";

export const DEFAULT_PREMIUM_ADDRESSES = {
  LITECOIN: "LSBHXJMH8hzXNyxb56ckVZ9L4GcDwbMtwc",
  BITCOIN: "bc1qlpay67xxtksmqdj9qxu24qk3ap9zwf5rg5s742",
  ETHEREUM: "0xD8FEADad7E30F788AB9DeEd1023cE756DeA92B2C",
};

const COIN_META = {
  LITECOIN: {
    label: "Litecoin",
    chain: "litecoin",
    coingeckoId: "litecoin",
    step: 0.000001,
    decimals: 8,
  },
  BITCOIN: {
    label: "Bitcoin",
    chain: "bitcoin",
    coingeckoId: "bitcoin",
    step: 0.00000001,
    decimals: 8,
  },
  ETHEREUM: {
    label: "Ethereum",
    chain: "ethereum",
    coingeckoId: "ethereum",
    step: 0.0000001,
    decimals: 8,
  },
};

function roundAmount(value, decimals) {
  return Number(value.toFixed(decimals));
}

function normalizeAddress(address) {
  return String(address || "").trim().toLowerCase();
}

function parseJsonArray(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function getCoinPricesUsd() {
  const response = await fetch(COINGECKO_SIMPLE_PRICE_URL, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Could not load live crypto prices.");
  }

  return response.json();
}

function getCoinConfig(env, prices) {
  return Object.fromEntries(
    VALID_COINS.map((coin) => {
      const meta = COIN_META[coin];
      const usdPrice = Number(prices?.[meta.coingeckoId]?.usd || 0);
      return [coin, {
        ...meta,
        address:
          env[`PREMIUM_${coin === "BITCOIN" ? "BTC" : coin === "LITECOIN" ? "LTC" : "ETH"}_ADDRESS`] ||
          DEFAULT_PREMIUM_ADDRESSES[coin],
        usdPrice,
      }];
    }),
  );
}

async function nextOrderSuffix(env) {
  const current = Number((await env.UPLOADS.get(ORDER_COUNTER_KEY)) || 0) + 1;
  await env.UPLOADS.put(ORDER_COUNTER_KEY, String(current));
  return (current % 900) + 100;
}

function buildExpectedAmount(usdPrice, coin, suffix) {
  const meta = COIN_META[coin];
  const baseAmount = PREMIUM_PRICE_USD / usdPrice;
  const uniqueAmount = baseAmount + suffix * meta.step;
  return roundAmount(uniqueAmount, meta.decimals);
}

async function getPendingIndex(env) {
  return parseJsonArray(await env.UPLOADS.get(PENDING_INDEX_KEY));
}

async function savePendingIndex(env, ids) {
  await env.UPLOADS.put(PENDING_INDEX_KEY, JSON.stringify(Array.from(new Set(ids))));
}

async function getOrder(env, orderId) {
  const raw = await env.UPLOADS.get(`premium_order:${orderId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveOrder(env, order) {
  await env.UPLOADS.put(`premium_order:${order.id}`, JSON.stringify(order));
}

async function markOrderStatus(env, order, status, extra = {}) {
  const updated = {
    ...order,
    status,
    ...extra,
  };
  await saveOrder(env, updated);
  return updated;
}

async function cleanupPendingOrder(env, order) {
  await env.UPLOADS.delete(`premium_user_coin_order:${order.userId}:${order.coin}`);
  const ids = await getPendingIndex(env);
  await savePendingIndex(env, ids.filter((id) => id !== order.id));
}

async function activatePremiumForOrder(env, order, match) {
  const rawUser = await env.UPLOADS.get(`user:${order.userId}`);
  if (!rawUser) {
    return markOrderStatus(env, order, "orphaned");
  }

  const storedUser = JSON.parse(rawUser);
  const updatedUser = {
    ...storedUser,
    premium: true,
    premiumActivatedAt: new Date().toISOString(),
    premiumSource: {
      coin: order.coin,
      txHash: match.txHash,
      amount: match.amount,
      address: order.address,
      orderId: order.id,
    },
  };

  await Promise.all([
    env.UPLOADS.put(`user:${order.userId}`, JSON.stringify(updatedUser)),
    env.UPLOADS.put(`premium_tx:${order.coin}:${match.txHash.toLowerCase()}`, order.userId),
  ]);

  const confirmedOrder = await markOrderStatus(env, order, "confirmed", {
    matchedTxHash: match.txHash,
    matchedAmount: match.amount,
    confirmedAt: new Date().toISOString(),
  });
  await cleanupPendingOrder(env, order);
  return confirmedOrder;
}

function buildBlockchairUrl(env, path) {
  const url = new URL(`${BLOCKCHAIR_API_ROOT}${path}`);
  if (env.BLOCKCHAIR_API_KEY) {
    url.searchParams.set("key", env.BLOCKCHAIR_API_KEY);
  }
  return url.toString();
}

async function fetchAddressTransactions(env, order) {
  const response = await fetch(
    buildBlockchairUrl(env, `/${COIN_META[order.coin].chain}/dashboards/address/${order.address}`),
    { headers: { accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error("Could not check premium payments right now.");
  }

  const payload = await response.json();
  const data = payload?.data?.[order.address] || payload?.data?.[normalizeAddress(order.address)];
  return Array.isArray(data?.transactions) ? data.transactions.slice(0, 50) : [];
}

function satoshiLikeToCoin(value) {
  return Number(value || 0) / 100000000;
}

function weiToEth(value) {
  return Number(value || 0) / 1000000000000000000;
}

async function fetchTransactionPayment(env, order, txHash) {
  const response = await fetch(
    buildBlockchairUrl(env, `/${COIN_META[order.coin].chain}/dashboards/transaction/${txHash}`),
    { headers: { accept: "application/json" } },
  );

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const entry = payload?.data?.[txHash];
  if (!entry) {
    return null;
  }

  const expectedAddress = normalizeAddress(order.address);

  if (order.coin === "ETHEREUM") {
    const transaction = entry?.transaction || {};
    const calls = Array.isArray(entry?.calls) ? entry.calls : [];
    let amount = 0;

    if (normalizeAddress(transaction.recipient) === expectedAddress) {
      amount += weiToEth(transaction.value_wei ?? transaction.value ?? 0);
    }

    for (const call of calls) {
      if (normalizeAddress(call?.recipient) !== expectedAddress) {
        continue;
      }
      amount += weiToEth(call?.value_wei ?? call?.value ?? 0);
    }

    if (Number(transaction.block_id || 0) <= 0) {
      return null;
    }

    return {
      txHash,
      amount: roundAmount(amount, COIN_META[order.coin].decimals),
    };
  }

  const outputs = Array.isArray(entry?.outputs) ? entry.outputs : [];
  let amount = 0;

  for (const output of outputs) {
    if (normalizeAddress(output?.recipient) !== expectedAddress) {
      continue;
    }
    amount += satoshiLikeToCoin(output?.value);
  }

  if (Number(entry?.transaction?.block_id || 0) <= 0) {
    return null;
  }

  return {
    txHash,
    amount: roundAmount(amount, COIN_META[order.coin].decimals),
  };
}

async function tryMatchOrderPayment(env, order) {
  const txHashes = await fetchAddressTransactions(env, order);

  for (const txHash of txHashes) {
    const used = await env.UPLOADS.get(`premium_tx:${order.coin}:${String(txHash).toLowerCase()}`);
    if (used) {
      continue;
    }

    const payment = await fetchTransactionPayment(env, order, txHash);
    if (!payment) {
      continue;
    }

    if (payment.amount === order.expectedAmount) {
      return payment;
    }
  }

  return null;
}

export async function processPendingPremiumOrders(env, onlyUserId = null) {
  const ids = await getPendingIndex(env);
  const results = [];

  for (const id of ids) {
    const order = await getOrder(env, id);
    if (!order) {
      continue;
    }

    if (onlyUserId && order.userId !== onlyUserId) {
      continue;
    }

    if (order.status !== "pending") {
      await cleanupPendingOrder(env, order);
      continue;
    }

    if (Date.parse(order.expiresAt) <= Date.now()) {
      const expiredOrder = await markOrderStatus(env, order, "expired");
      await cleanupPendingOrder(env, expiredOrder);
      results.push(expiredOrder);
      continue;
    }

    try {
      const match = await tryMatchOrderPayment(env, order);
      if (match) {
        const confirmed = await activatePremiumForOrder(env, order, match);
        results.push(confirmed);
      } else {
        results.push(order);
      }
    } catch {
      results.push(order);
    }
  }

  return results;
}

export async function getOrCreatePremiumOrders(env, user) {
  await processPendingPremiumOrders(env, user.id);

  const prices = await getCoinPricesUsd();
  const coinConfig = getCoinConfig(env, prices);
  const coins = {};

  for (const coin of VALID_COINS) {
    const orderKey = `premium_user_coin_order:${user.id}:${coin}`;
    let order = null;
    const existingOrderId = await env.UPLOADS.get(orderKey);
    if (existingOrderId) {
      order = await getOrder(env, existingOrderId);
      if (order && (order.status !== "pending" || Date.parse(order.expiresAt) <= Date.now())) {
        await cleanupPendingOrder(env, order);
        order = null;
      }
    }

    if (!order) {
      const suffix = await nextOrderSuffix(env);
      const expectedAmount = buildExpectedAmount(coinConfig[coin].usdPrice, coin, suffix);
      const now = Date.now();
      order = {
        id: crypto.randomUUID().replace(/-/g, ""),
        userId: user.id,
        username: user.username,
        coin,
        address: coinConfig[coin].address,
        expectedAmount,
        usdPrice: coinConfig[coin].usdPrice,
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + PREMIUM_ORDER_TTL_MS).toISOString(),
        status: "pending",
      };

      await Promise.all([
        saveOrder(env, order),
        env.UPLOADS.put(orderKey, order.id),
      ]);
      const ids = await getPendingIndex(env);
      ids.push(order.id);
      await savePendingIndex(env, ids);
    }

    coins[coin] = {
      label: coinConfig[coin].label,
      address: order.address,
      expectedAmount: order.expectedAmount,
      currencySymbol: coin === "BITCOIN" ? "BTC" : coin === "LITECOIN" ? "LTC" : "ETH",
      orderId: order.id,
      expiresAt: order.expiresAt,
      status: order.status,
    };
  }

  return {
    amountUsd: PREMIUM_PRICE_USD,
    premium: false,
    coins,
  };
}

export async function onDemandRefreshPremium(env, request) {
  const user = await getCurrentUser(env, request);
  if (!user) {
    return json({ error: "Log in to buy premium." }, { status: 401 });
  }

  if (user.premium) {
    return json({
      ok: true,
      amountUsd: PREMIUM_PRICE_USD,
      premium: true,
      coins: {},
    });
  }

  const checkout = await getOrCreatePremiumOrders(env, user);
  const refreshedUser = await getCurrentUser(env, request);

  if (refreshedUser?.premium) {
    return json({
      ok: true,
      amountUsd: PREMIUM_PRICE_USD,
      premium: true,
      coins: {},
    });
  }

  return json({
    ok: true,
    ...checkout,
  });
}
