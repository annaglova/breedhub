import type { LandingStatistic } from "@/constants/landingMockData";
import { Link } from "react-router-dom";

interface StatisticsSectionProps {
  statisticsData: LandingStatistic[];
}

export function StatisticsSection({ statisticsData }: StatisticsSectionProps) {
  return (
    <div className="mt-20 flex w-full flex-col items-center xl:flex-row lg:mt-24">
      <div className="text-secondary-600 mb-8 shrink-0 text-start text-4xl font-semibold xl:mb-0 xl:mr-12">
        Best pet's knowledge base
      </div>
      <div className="grid w-full gap-3 md:grid-cols-3">
        {statisticsData.map((stat, index) => (
          <div key={index}>
            {stat.href ? (
              <Link
                to={stat.href}
                className={`flex flex-col items-center rounded-l-full bg-gradient-to-r to-transparent px-4 py-3 transition-transform hover:scale-105 ${stat.color}`}
              >
                <span className="text-3xl font-bold">{stat.value}</span>
                <span className="text-secondary-600 text-lg font-semibold uppercase">
                  {stat.label}
                </span>
              </Link>
            ) : (
              <div
                className={`flex flex-col items-center rounded-l-full bg-gradient-to-r to-transparent px-4 py-3 ${stat.color}`}
              >
                <span className="text-3xl font-bold">{stat.value}</span>
                <span className="text-secondary-600 text-lg font-semibold uppercase">
                  {stat.label}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
