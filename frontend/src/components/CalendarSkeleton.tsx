const CalendarSkeleton: React.FC = () => {
    return (
        <div className="calendar-section skeleton">
            <div className="calendar-header skeleton-header">
                <div className="skeleton-nav" />
                <div className="skeleton-month" />
                <div className="skeleton-nav" />
            </div>

            <div className="calendar-weekdays">
                {Array.from({ length: 7 }).map((_, index) => (
                    <div key={index} className="skeleton-weekday" />
                ))}
            </div>

            <div className="calendar-grid">
                {Array.from({ length: 42 }).map((_, index) => (
                    <div key={index} className="skeleton-day" />
                ))}
            </div>

            <ul className="calendar-events-list">
                {Array.from({ length: 3 }).map((_, index) => (
                    <li key={index} className="skeleton-event">
                        <div className="skeleton-summary" />
                        <div className="skeleton-time" />
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default CalendarSkeleton;