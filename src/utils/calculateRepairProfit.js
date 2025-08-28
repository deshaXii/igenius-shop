export const calculateRepairProfit = (price, parts) => {
  const totalPartsCost = parts.reduce(
    (sum, part) => sum + Number(part.cost || 0),
    0
  );
  const profit = price - totalPartsCost;
  const techProfit = profit / 2;
  const shopProfit = profit / 2;

  return { totalPartsCost, profit, techProfit, shopProfit };
};
