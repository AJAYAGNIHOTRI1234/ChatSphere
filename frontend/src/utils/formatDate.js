/**
 * Formats a user's lastSeen timestamp into human-readable text.
 * E.g.: "Last seen today at 2:45 PM", "Last seen yesterday at 11:30 AM", "Last seen Oct 14 at 4:15 PM"
 * @param {string | Date} lastSeenDate - ISO timestamp or Date object
 * @returns {string} Formatted last seen string
 */
export const formatLastSeen = (lastSeenDate) => {
    if (!lastSeenDate) return "Offline";

    const date = new Date(lastSeenDate);
    if (isNaN(date.getTime())) return "Offline";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) {
        return "Last seen just now";
    }

    const timeString = date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });

    const isToday = now.toDateString() === date.toDateString();
    if (isToday) {
        return `Last seen today at ${timeString}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (yesterday.toDateString() === date.toDateString()) {
        return `Last seen yesterday at ${timeString}`;
    }

    const isThisYear = now.getFullYear() === date.getFullYear();
    if (isThisYear) {
        const monthDay = date.toLocaleDateString([], {
            month: "short",
            day: "numeric"
        });
        return `Last seen ${monthDay} at ${timeString}`;
    }

    return `Last seen ${date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric"
    })} at ${timeString}`;
};

export default formatLastSeen;

