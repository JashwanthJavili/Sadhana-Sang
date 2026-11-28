import React, { useState } from 'react';
import WeeklyCard from '../components/planner/WeeklyCard';
import { localDateKey } from '../utils/date';

/** The planner is the weekly sadhana card. */
const DailyPlanner: React.FC = () => {
  const [date, setDate] = useState(localDateKey());
  return <WeeklyCard anchorDate={date} onAnchorChange={setDate} />;
};

export default DailyPlanner;
