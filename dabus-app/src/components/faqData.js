// FAQ shown in Settings -> Frequently Asked Questions. Edit freely.
// Each section: { title: "section name", items: [{ q: "question", a: "answer" }] }
// Fare info from thebus.org, effective July 1, 2026.
const FAQ_SECTIONS = [
  {
    title: "Using the app",
    items: [
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
    ],
  },
  {
    title: "Fares & passes",
    items: [
      {
        q: "How much does it cost to ride TheBus?",
        a: "Cash fare is $3.25 per boarding — exact fare only, since operators don't carry change, and cash fares don't include transfers. With a HOLO card, a tap costs $3.00 and works as a 2-hour pass with unlimited rides on TheBus and Skyline. One child 5 or under rides free with a fare-paying rider when not occupying a seat.",
      },
      {
        q: "What is a HOLO card and where do I get one?",
        a: "HOLO is Oahu's reloadable tap-to-pay transit card. Cards cost $2.00 (initial or replacement) and can be bought or reloaded at holocard.net, at HOLO retail locations around the island, or by phone at 808-768-4656.",
      },
      {
        q: "What passes are available?",
        a: "With a HOLO card: 2-hour pass $3.00, 24-hour pass $7.50, 3-day pass $20.00 (valid 72 hours from first use), 7-day pass $45.00 (valid 168 hours), monthly pass $90.00 (calendar month), and an annual pass for $990.00 through the Transit Pass Office or holocard.net.",
      },
      {
        q: "What are the daily and monthly fare caps?",
        a: "HOLO caps what you can be charged: once you've paid $7.50 in a day or $90.00 in a month, the rest of your rides that day or month are free. Caps happen automatically — just keep tapping the same card.",
      },
      {
        q: "Do I get a transfer?",
        a: "Not with cash — each boarding costs the full $3.25. With a HOLO card, your $3.00 tap covers unlimited rides for two hours, which works like a transfer.",
      },
      {
        q: "Are these fares current?",
        a: "Fares shown are effective July 1, 2026. Prices can change — check thebus.org for the latest official fare information.",
      },
    ],
  },
  {
    title: "Reduced fares",
    items: [
      {
        q: "Who qualifies for reduced fares?",
        a: "Youth age 6-17 (including high school students up to 19 with a valid school ID), seniors 65 and older, people with disabilities, U.S. Medicare cardholders under 65, Handi-Van-eligible riders, and riders approved for the City's low-income fare program. All reduced fares require a Reduced Fare HOLO card, with documentation plus a valid government-issued photo ID showing your date of birth.",
      },
      {
        q: "What are the youth fares?",
        a: "With a Youth HOLO card: cash fare $1.75, 2-hour pass $1.50, 24-hour pass and day cap $3.75, monthly pass or cap $45.00, annual pass $495.00. Youth cards expire on June 30 after the rider turns 18 - students 18 or 19 need proof of high school enrollment.",
      },
      {
        q: "What are the senior fares?",
        a: "With a Senior HOLO card (65+): cash fare $1.50, 2-hour pass $1.25, 24-hour pass and day cap $3.00. Hawaii residents (Kamaaina, verified with a Hawaii driver's license or State ID) also get a $20.00 monthly pass or cap and a $45.00 annual pass.",
      },
      {
        q: "What are the disability, Medicare, and Handi-Van fares?",
        a: "All three match the senior rates: cash fare $1.50, 2-hour pass $1.25, 24-hour pass and day cap $3.00. The $20.00 monthly pass or cap and $45.00 annual pass are available to Hawaii residents (Kamaaina) and all Handi-Van cardholders. Medicare HOLO cards are renewed every 4 years, temporary disability fares end when the prescribed period ends, and a Handi-Van pass can't extend past your Handi-Van eligibility.",
      },
      {
        q: "How do I get a Reduced Fare HOLO card?",
        a: "Youth and Senior cards are issued at Satellite City Halls (except the Ala Moana Center location) and the Transit Pass Office. Disability, Medicare, and Handi-Van cards go through the Kalihi Transit Pass Office and have their own application forms. Application forms and details are on thebus.org under Fares & Passes.",
      },
    ],
  },
];

export default FAQ_SECTIONS;
