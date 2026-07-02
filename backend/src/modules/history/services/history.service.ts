import { IHistoryRepository } from '../repositories/history.repository.interface';
import { IPortfolioRepository } from '../../portfolio/repositories/portfolio.repository.interface';
import { marketSimulator } from '../../market/services/market-simulator.service';

export class HistoryService {
  constructor(
    private historyRepository: IHistoryRepository,
    private portfolioRepository: IPortfolioRepository
  ) {}

  async getTradeHistory(params: {
    userId: string;
    ticker?: string;
    orderType?: string;
    status?: string;
    page: number;
    limit: number;
  }) {
    const page = Math.max(1, params.page);
    const limit = Math.max(1, Math.min(100, params.limit));
    const offset = (page - 1) * limit;

    const { orders, totalCount } = await this.historyRepository.getOrders({
      userId: params.userId,
      ticker: params.ticker,
      orderType: params.orderType,
      status: params.status,
      limit,
      offset,
    });

    return {
      orders,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getAnalytics(userId: string) {
    const portfolio = await this.portfolioRepository.getPortfolioWithHoldings(userId);
    
    let totalInvested = 0;
    let currentHoldingsValue = 0;
    let wins = 0;
    let losses = 0;
    
    let bestAsset: { ticker: string; name: string; returnPct: number } | null = null;
    let worstAsset: { ticker: string; name: string; returnPct: number } | null = null;

    await Promise.all(
      portfolio.holdings.map(async (holding) => {
        const latestPrice = (await marketSimulator.getPrice(holding.ticker)) ?? holding.avgBuyPrice;
        
        const investedValue = holding.quantity * holding.avgBuyPrice;
        const currentMarketValue = holding.quantity * latestPrice;
        const unrealizedPnL = currentMarketValue - investedValue;
        const unrealizedPnLPct = investedValue > 0 ? (unrealizedPnL / investedValue) * 100 : 0;

        totalInvested += investedValue;
        currentHoldingsValue += currentMarketValue;

        if (unrealizedPnL > 0) {
          wins++;
        } else if (unrealizedPnL < 0) {
          losses++;
        }

        if (!bestAsset || unrealizedPnLPct > bestAsset.returnPct) {
          bestAsset = {
            ticker: holding.ticker,
            name: holding.name,
            returnPct: Number(unrealizedPnLPct.toFixed(2)),
          };
        }

        if (!worstAsset || unrealizedPnLPct < worstAsset.returnPct) {
          worstAsset = {
            ticker: holding.ticker,
            name: holding.name,
            returnPct: Number(unrealizedPnLPct.toFixed(2)),
          };
        }
      })
    );

    const totalValuation = portfolio.balance + currentHoldingsValue;
    const totalPnL = currentHoldingsValue - totalInvested;
    const totalReturnPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    const totalHoldings = portfolio.holdings.length;
    const winRatio = totalHoldings > 0 ? wins / totalHoldings : 0;
    const winRatePct = winRatio * 100;

    // Generate simulated 7-day growth history matching current total valuation
    const growthChart = [];
    const baseValuation = totalValuation;
    const days = 7;
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const formattedDate = date.toISOString().split('T')[0];
      
      // Calculate a randomized valuation back in time, centered around baseValuation
      // If i == 0, it must match current valuation exactly
      let dayValuation = baseValuation;
      if (i > 0) {
        // Back-simulate random walks
        const changeFactor = 1 - (i * (Math.random() * 0.02 - 0.008)); // Slight upward bias
        dayValuation = baseValuation * changeFactor;
      }

      growthChart.push({
        date: formattedDate,
        valuation: Number(dayValuation.toFixed(2)),
      });
    }

    return {
      summary: {
        totalValuation: Number(totalValuation.toFixed(2)),
        cashBalance: Number(portfolio.balance.toFixed(2)),
        investedValue: Number(totalInvested.toFixed(2)),
        totalReturnPct: Number(totalReturnPct.toFixed(2)),
        totalPnL: Number(totalPnL.toFixed(2)),
      },
      metrics: {
        winLossRatio: losses > 0 ? Number((wins / losses).toFixed(2)) : wins,
        winRatePct: Number(winRatePct.toFixed(2)),
        bestPerformingAsset: bestAsset,
        worstPerformingAsset: worstAsset,
      },
      growthChart,
    };
  }
}
export default HistoryService;
