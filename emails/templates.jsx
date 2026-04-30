import * as React from "react";

export default function EmailTemplate({
  userName = "",
  type = "monthly-report",
  data = {},
}) {
  if (type === "monthly-report") {
    return (
      <div style={styles.body}>
        <div style={styles.container}>
          <h1 style={styles.title}>Monthly Financial Report</h1>

          <p style={styles.text}>Hello {userName},</p>
          <p style={styles.text}>
            Here&rsquo;s your financial summary for {data?.month}:
          </p>

          <div style={styles.statsContainer}>
            <div style={styles.stat}>
              <p style={styles.statLabel}>Total Income</p>
              <p style={styles.statValue}>₹{data?.stats?.totalIncome?.toFixed(2)}</p>
            </div>
            <div style={styles.stat}>
              <p style={styles.statLabel}>Total Expenses</p>
              <p style={styles.statValue}>₹{data?.stats?.totalExpenses?.toFixed(2)}</p>
            </div>
            <div style={styles.stat}>
              <p style={styles.statLabel}>Net</p>
              <p style={styles.statValue}>
                ₹{((data?.stats?.totalIncome || 0) - (data?.stats?.totalExpenses || 0)).toFixed(2)}
              </p>
            </div>
          </div>

          {data?.stats?.byCategory && (
            <div style={styles.section}>
              <h2 style={styles.heading}>Expenses by Category</h2>
              {Object.entries(data.stats.byCategory).map(([category, amount]) => (
                <div key={category} style={styles.row}>
                  <span style={styles.text}>{category}</span>
                  <span style={styles.text}>₹{Number(amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {data?.insights && (
            <div style={styles.section}>
              <h2 style={styles.heading}>AI Insights</h2>
              {data.insights.map((insight, index) => (
                <p key={index} style={styles.text}>• {insight}</p>
              ))}
            </div>
          )}

          <p style={styles.footer}>
            Thank you for using Wealth. Keep tracking your finances!
          </p>
        </div>
      </div>
    );
  }

  if (type === "budget-alert") {
    return (
      <div style={styles.body}>
        <div style={styles.container}>
          <h1 style={styles.title}>Budget Alert 🚨</h1>
          <p style={styles.text}>Hello {userName},</p>
          <p style={styles.text}>
            You&rsquo;ve used <strong>{Number(data?.percentageUsed).toFixed(1)}%</strong> of your
            monthly budget for <strong>{data?.accountName}</strong>.
          </p>

          <div style={styles.statsContainer}>
            <div style={styles.stat}>
              <p style={styles.statLabel}>Budget</p>
              <p style={styles.statValue}>₹{Number(data?.budgetAmount).toFixed(2)}</p>
            </div>
            <div style={styles.stat}>
              <p style={styles.statLabel}>Spent</p>
              <p style={{ ...styles.statValue, color: "#ef4444" }}>
                ₹{Number(data?.totalExpenses).toFixed(2)}
              </p>
            </div>
            <div style={styles.stat}>
              <p style={styles.statLabel}>Remaining</p>
              <p style={{ ...styles.statValue, color: "#16a34a" }}>
                ₹{(Number(data?.budgetAmount) - Number(data?.totalExpenses)).toFixed(2)}
              </p>
            </div>
          </div>

          <div style={styles.progressBg}>
            <div
              style={{
                ...styles.progressFill,
                width: `${Math.min(Number(data?.percentageUsed), 100)}%`,
                backgroundColor:
                  data?.percentageUsed >= 90 ? "#ef4444" :
                  data?.percentageUsed >= 75 ? "#f59e0b" : "#16a34a",
              }}
            />
          </div>

          <p style={styles.footer}>
            Manage your budget in your Wealth dashboard.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

const styles = {
  body: {
    backgroundColor: "#f6f9fc",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    padding: "40px 0",
  },
  container: {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "40px",
    borderRadius: "8px",
    maxWidth: "560px",
    border: "1px solid #e5e7eb",
  },
  title: {
    color: "#111827",
    fontSize: "24px",
    fontWeight: "700",
    marginBottom: "16px",
  },
  heading: {
    color: "#1f2937",
    fontSize: "18px",
    fontWeight: "600",
    marginBottom: "12px",
  },
  text: {
    color: "#4b5563",
    fontSize: "15px",
    lineHeight: "1.6",
    margin: "0 0 12px",
  },
  statsContainer: {
    display: "flex",
    gap: "12px",
    margin: "24px 0",
  },
  stat: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
    padding: "16px",
    textAlign: "center",
  },
  statLabel: {
    fontSize: "12px",
    color: "#6b7280",
    margin: "0 0 4px",
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#111827",
    margin: 0,
  },
  section: {
    marginTop: "24px",
    padding: "20px",
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #e5e7eb",
  },
  progressBg: {
    backgroundColor: "#e5e7eb",
    borderRadius: "9999px",
    height: "10px",
    overflow: "hidden",
    margin: "16px 0",
  },
  progressFill: {
    height: "100%",
    borderRadius: "9999px",
  },
  footer: {
    color: "#9ca3af",
    fontSize: "13px",
    textAlign: "center",
    marginTop: "32px",
    paddingTop: "16px",
    borderTop: "1px solid #e5e7eb",
  },
};
