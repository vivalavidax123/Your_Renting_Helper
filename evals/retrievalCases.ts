// Questions for the renting rules search, in the everyday words a renter
// would use, each labelled with the chunk ids that answer it (any one counts
// as a hit). Ids are "<page>#<section>" from app/lib/data/renting-rules.json,
// so a re-ingest that renames a section makes the eval fail loudly.
//
// `expected: []` marks a question the guidance does not cover. Ideally the
// search returns nothing for it; the eval reports how often that happens.

export type RetrievalCase = {
  id: string;
  question: string;
  expected: string[];
  // Words from the question that appear word for word in an expected chunk.
  // Vector search can still miss these; the eval counts such misses as
  // "exact-term misses", the case keyword search would fix.
  keyTerms?: string[];
};

export const retrievalCases: RetrievalCase[] = [
  {
    id: "bond-max",
    question:
      "The agent wants 6 weeks bond on a $600 a week place, is that allowed?",
    expected: ["bond#maximum-bond-amounts"],
  },
  {
    id: "bond-lodged",
    question:
      "I paid my bond to the property manager, how long do they have to lodge it?",
    expected: ["bond#how-and-when-bonds-are-paid"],
  },
  {
    id: "bond-wear-and-tear",
    question:
      "Can the landlord keep my bond for faded curtains and worn carpet?",
    expected: [
      "bond-refunds#reasons-for-claiming-bond",
      "bond-refunds#reasons-for-claiming-bond-2",
    ],
  },
  {
    id: "bond-refund-steps",
    question: "How do I get my bond back after I move out?",
    expected: [
      "bond-refunds#getting-the-bond-back",
      "bond-refunds#how-to-claim-a-bond-with-the-rtba",
    ],
  },
  {
    id: "pet-bond",
    question: "Can they charge me an extra pet bond for my cat?",
    expected: ["pets#pet-bonds"],
    keyTerms: ["pet bond"],
  },
  {
    id: "rent-increase-frequency",
    question:
      "My landlord put the rent up 8 months ago and wants to raise it again. Can they?",
    expected: [
      "rent-increases#how-often-rent-can-increase",
      "rent-increases#how-often-rent-can-increase-2",
    ],
  },
  {
    id: "rent-increase-notice",
    question: "How much warning do I get before a rent increase?",
    expected: [
      "rent-increases#rules-for-increasing-rent",
      "rent-increases#telling-renters-about-rent-increases",
    ],
  },
  {
    id: "rent-increase-too-high",
    question:
      "The new rent is way above what similar flats nearby cost. What can I do?",
    expected: [
      "challenging-rent#how-to-challenge-a-rent-increase",
      "challenging-rent#how-to-get-a-rent-assessment",
    ],
  },
  {
    id: "rent-advance",
    question:
      "How many weeks of rent in advance can they ask for when I sign the lease?",
    expected: ["rent-payments#charging-rent-in-advance"],
    keyTerms: ["rent in advance"],
  },
  {
    id: "late-fee",
    question: "Is a $50 late payment fee on rent legal?",
    expected: [
      "rent-payments#illegal-fees-and-charges",
      "unpaid-rent#late-rent-and-late-fees",
    ],
    keyTerms: ["late payment"],
  },
  {
    id: "rent-arrears-evict",
    question: "I'm two weeks behind on rent. Can I be kicked out?",
    expected: [
      "unpaid-rent#notice-to-vacate-for-unpaid-rent",
      "unpaid-rent#limits-on-how-often-a-renter-can-pay-late",
    ],
  },
  {
    id: "urgent-repair-heater",
    question:
      "The hot water system died and the agent isn't answering. What now?",
    expected: [
      "repairs#list-of-urgent-repairs",
      "repairs#when-the-rental-provider-does-not-respond",
      "repairs#organising-and-paying-for-repairs",
    ],
  },
  {
    id: "non-urgent-repair-time",
    question: "How long does the landlord have to fix a broken dishwasher?",
    expected: ["repairs#urgent-and-non-urgent-repairs"],
    keyTerms: ["dishwasher"],
  },
  {
    id: "withhold-rent",
    question: "Can I stop paying rent until they fix the leaking roof?",
    expected: [
      "repairs#paying-rent-during-repairs",
      "rent-payments#stopping-rent-payments",
    ],
  },
  {
    id: "mould",
    question:
      "There's black mould in the bedroom from the walls. Is the landlord responsible?",
    expected: [
      "minimum-standards#lighting-ventilation-mould-and-structure",
      "repairs#list-of-urgent-repairs",
    ],
    keyTerms: ["mould"],
  },
  {
    id: "heater-standard",
    question:
      "The apartment only has a portable heater. Does it need a proper one?",
    expected: ["minimum-standards#heating"],
    keyTerms: ["portable"],
  },
  {
    id: "condition-report",
    question:
      "I just moved in and never got a condition report. What should I do?",
    expected: [
      "condition-reports#condition-reports-at-the-start-of-the-agreement",
    ],
    keyTerms: ["condition report"],
  },
  {
    id: "pet-request",
    question:
      "How do I ask to have a dog in my rental, and what if they ignore me?",
    expected: ["pets#asking-to-keep-a-pet"],
  },
  {
    id: "picture-hooks",
    question:
      "Am I allowed to put up picture hooks and shelves without asking?",
    expected: ["modifications#changes-that-can-be-made-without-permission"],
    keyTerms: ["picture hooks"],
  },
  {
    id: "inspection-frequency",
    question:
      "The agent wants to inspect every month. How often are routine inspections allowed?",
    expected: [
      "entry#general-inspections",
      "entry#renters-rights-to-refuse-entry",
    ],
  },
  {
    id: "entry-notice",
    question:
      "How much notice does the landlord need to give before coming in?",
    expected: ["entry#notice-required-before-entry"],
  },
  {
    id: "sales-inspection",
    question:
      "The owner is selling. Do I get anything for letting buyers walk through?",
    expected: [
      "entry#showing-the-property-to-buyers-and-sales-inspection-compensation",
    ],
  },
  {
    id: "no-fault-eviction",
    question:
      "My lease is ending. Can the landlord make me leave without a reason?",
    expected: [
      "notice-to-vacate#notice-at-the-end-of-a-fixed-term-agreement",
      "new-laws#changes-from-25-november-2025",
    ],
  },
  {
    id: "sale-notice-period",
    question:
      "They're selling the house and want us out. How much notice do we get?",
    expected: [
      "notice-to-vacate#reasons-evidence-and-notice-periods-at-the-end-of-an-agreement",
    ],
  },
  {
    id: "renter-leave-notice",
    question:
      "How much notice do I need to give when I want to move out at the end of my lease?",
    expected: [
      "renter-notice#notice-at-the-end-of-an-agreement",
      "renter-notice#reasons-and-notice-periods-for-leaving-early",
    ],
  },
  {
    id: "break-lease-costs",
    question: "If I break my lease six months early, what do I have to pay?",
    expected: [
      "breaking-lease#costs-for-breaking-an-agreement",
      "breaking-lease#what-it-means-to-break-a-rental-agreement",
    ],
  },
  {
    id: "dispute-help",
    question:
      "The landlord and I can't agree. Where can I get free help to sort it out?",
    expected: [
      "disputes#steps-to-resolving-a-renting-dispute",
      "disputes#going-to-rdrv",
      "disputes#further-help",
    ],
  },
  {
    id: "application-fee",
    question:
      "The rental app wants a fee to submit my application. Is that allowed?",
    expected: [
      "new-laws#changes-from-13-october-2026",
      "rent-payments#illegal-fees-and-charges",
    ],
  },

  // Not covered by the guidance (reported, not enforced).
  {
    id: "uncovered-buying",
    question: "What stamp duty do first home buyers pay in Victoria?",
    expected: [],
  },
  {
    id: "uncovered-coffee",
    question: "Which suburb has the best coffee in Melbourne?",
    expected: [],
  },
  {
    id: "uncovered-tax",
    question: "Can I claim my rent as a tax deduction when working from home?",
    expected: [],
  },
];
