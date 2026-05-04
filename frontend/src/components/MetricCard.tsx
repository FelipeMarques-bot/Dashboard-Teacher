import { motion } from "framer-motion";
import type { ReactNode } from "react";

type MetricCardProps = {
  title: string;
  value: string | number;
  icon: ReactNode;
  hint: string;
};

export function MetricCard({ title, value, icon, hint }: MetricCardProps) {
  return (
    <motion.article
      className="metric-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="metric-icon">{icon}</div>
      <h3>{title}</h3>
      <strong>{value}</strong>
      <p>{hint}</p>
    </motion.article>
  );
}
