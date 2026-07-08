// FAQ shown in Settings -> Frequently Asked Questions. Edit freely.
// Each item: { q: "question", a: "answer" }
const FAQ_ITEMS = [
  {
    q: "How accurate are the arrival times?",
    a: "Arrival times come straight from TheBus's real-time vehicle data, so they're usually within a minute or two. When a bus isn't reporting its position, you'll see the scheduled time instead. Pull down to refresh for the latest estimates.",
  },
  {
    q: "Why can't the app find stops near me?",
    a: "Make sure location access is allowed for your browser or the installed app. If stops still don't appear, you may be outside the search radius — you can widen it in Settings under Nearby stops.",
  },
  {
    q: "How do I look up a stop directly?",
    a: "Type a stop number into the search bar to jump straight to its arrivals, or type a street name to find stops near an address. Every stop sign on Oahu has its stop number printed on it.",
  },
  {
    q: "How do I save a stop?",
    a: "Open a stop's arrivals and tap the star. You can give it a custom name like Home or Work, and it will show up in the Favorites tab.",
  },
  {
    q: "Can I see where my bus is right now?",
    a: "Yes — open a stop's arrivals and tap a bus to see its live position on the map, along with its route path and upcoming stops.",
  },
  {
    q: "Why did a bus disappear from the map or list?",
    a: "Buses occasionally stop reporting GPS for a few minutes, or a trip gets reassigned or cancelled. If a bus vanishes, refresh the arrivals — it will usually reappear once it starts reporting again.",
  },
  {
    q: "Does the app work offline?",
    a: "The app itself loads offline once installed, but live arrivals and bus positions need a connection. Route and stop info may be limited until you're back online.",
  },
  {
    q: "Is this an official TheBus app?",
    a: "No — this is an independent app. Route and arrival data are provided by permission of Oahu Transit Services, but the app isn't affiliated with or endorsed by OTS or the City and County of Honolulu.",
  },
];

export default FAQ_ITEMS;
