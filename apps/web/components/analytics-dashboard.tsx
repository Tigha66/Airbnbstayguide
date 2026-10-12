"use client";
import type { AnalyticsMetrics } from "@stayguide/shared";
import { TrendingUp, Eye, MessageCircle, Gift, Smile } from "lucide-react";

interface AnalyticsDashboardProps {
  metrics: AnalyticsMetrics;
  tr: (key: string, params?: Record<string, any>) => string;
}

export function AnalyticsDashboard({ metrics, tr }: AnalyticsDashboardProps) {
  const stats = [
    {
      label: tr("Guide views"),
      value: metrics.viewCount.toLocaleString(),
      icon: Eye,
      change: "+18.6%",
    },
    {
      label: tr("Questions"),
      value: metrics.questionsCount.toLocaleString(),
      icon: MessageCircle,
      change: "+12.3%",
    },
    {
      label: tr("Extras revenue"),
      value: `$${(metrics.extrasRevenue / 100).toFixed(0)}`,
      icon: Gift,
      change: "+24.2%",
    },
    {
      label: tr("Guest satisfaction"),
      value: `${metrics.guestSatisfaction}%`,
      icon: Smile,
      change: "+2.1%",
    },
  ];

  return (
    <div className="analytics-dashboard">
      <div className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card stat-card">
              <div className="stat-top">
                {stat.label}
                <Icon size={15} />
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-foot">
                <TrendingUp size={11} />
                <em>{stat.change}</em>
                <span>{tr("vs. previous period")}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="charts-grid">
        {/* Views Trend */}
        <div className="card chart-card">
          <h3>{tr("Views this month")}</h3>
          <div className="mini-chart">
            {metrics.viewTrend.slice(-7).map((day, i) => (
              <div
                key={i}
                className="chart-bar"
                style={{
                  height: `${(day.count / Math.max(...metrics.viewTrend.map((d) => d.count))) * 100}%`,
                }}
                title={`${day.date}: ${day.count} views`}
              />
            ))}
          </div>
          <small>{tr("Last 7 days")}</small>
        </div>

        {/* Questions by Category */}
        <div className="card chart-card">
          <h3>{tr("Questions by category")}</h3>
          <div className="category-list">
            {metrics.questionsByCategory.slice(0, 5).map((cat) => (
              <div key={cat.category} className="category-item">
                <span>{cat.category}</span>
                <span className="count">{cat.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Guides */}
        <div className="card chart-card">
          <h3>{tr("Top performing guides")}</h3>
          <div className="guides-list">
            {metrics.topGuides.map((guide) => (
              <div key={guide.id} className="guide-item">
                <span>{guide.name}</span>
                <span className="views">{guide.views} views</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
