# Text case

2026-11-13. Built on `fix/text-case`.

One rule for capital letters in every app: the website, Manage and Connect, their emails
and their PDFs. Before it, Manage's page titles were in Title Case and nearly everything
else in sentence case, with strays each way ("Our services" on the home page, "Customer
Info" beside "Your vehicle" on the confirm step, "All locations" on a button over "All
Locations" in its menu).

## The rule

**A label is in Title Case. A sentence is in sentence case.**

A label names a thing, a field, a state or an action in a few words. A sentence tells the
reader something, or asks. Where the words stand decides which they are:

### Title Case

| Part                               | Examples                                                              |
| ---------------------------------- | --------------------------------------------------------------------- |
| A page's title and its browser tab | "My Bookings", "Add Vehicle", "Good Afternoon, Fikri"                 |
| A section's, card's or sub heading | "Our Services", "Popular Places in Langkawi", "What It Offers"        |
| The small label over a heading     | "What We Offer", "Admin Portal"                                       |
| A dialog's or panel's title        | "Add an Agent", "Change Payment Terms"                                |
| Menu rows, nav links, tabs, trails | "All Locations", "Tour Guides", "Sign In"                             |
| Buttons, and links that act as one | "Book Now", "Add Zone", "Save Changes", "Yes, Cancel This Booking"    |
| A table's column headers           | "Invoice No", "Billed To", "In Service"                               |
| Field labels, and a group's label  | "Contact Person", "SSM Number", "Company or Individual", "Paid To"    |
| Row labels in a details list       | "Pick-up Time", "Road Distance", "Booking Number", in emails and PDFs |
| An option in a list of choices     | "Vehicle Only", "Bank Transfer", "Twice a Month", "All Images"        |
| Status words, chips and badges     | "To Assign", "Waiting to Accept", "Driver Assigned", "Partially Paid" |
| The label of a tile or a count     | "Pick-ups Today", "Done Today", "Coming Up"                           |
| The name of a kind, a line, a part | "Credit Note", "Base Fare", "Odd-hours Surcharge", "Hero Image"       |
| The names of services and pages    | "Car with Driver", "Coach Charter", "About Us", "Main Page"           |

### Sentence case

| Part                                           | Examples                                                              |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| A question, wherever it stands                 | "Delete Langkawi?", "Forgot your password?", "Why can't you take it?" |
| A message: an error, a toast, an empty state   | "Trip removed", "No bookings yet", "We can't find that page"          |
| Descriptions, hints and help                   | "The company's registered name."                                      |
| Tooltips and screen-reader labels              | "Preview the saved draft", "Search bookings"                          |
| A lone tick box or switch                      | "Sign out of my other devices", "Drop off elsewhere", "Make admin"    |
| A note beside a heading or in place of a value | "Staff only", "3 of 5 done", "None yet", "Not priced yet"             |
| Placeholders                                   | "from the name"; an example is typed as its value ("Follow Us On")    |
| A numbered step that tells what happens        | "The offer comes in", "A driver signs in"                             |
| Email subjects and email headings              | "Booking HTB-1042 confirmed", "Your booking is confirmed"             |
| Activity lines                                 | "Changed the contact person"                                          |

### Capitals, small letters, and what is never used

- **UPPERCASE comes from CSS only:** the small label over a heading, a menu group's name, a
  dense grid's headers, a stamp. The source holds the words in Title Case, so a screen
  reader and a copy read words. Real acronyms are typed: SEO, FAQ, PDF, VOID, PAID.
- **lowercase** is for a link or a word inside a sentence: "or create an account", "the
  pick-up".
- **Never:** small caps (`font-variant`), CSS `capitalize` (it cannot keep "in" small), a
  name typed in capitals.

## The words of a title

- These stay small unless they open or close the title: a, an, the, and, or, but, nor, as,
  at, by, for, from, in, into, of, on, onto, per, to, via, vs, with. So "Car with Driver",
  "Terms and Conditions", "Billed To", "The Class".
- Every other word takes a capital, the short ones too: "What It Offers", "When It Is
  Shared", "Its Page", "Not Named Yet".
- The small word of a verb is part of the verb: "Sign In", "Sign Up", "Sign In to
  Connect", "Drop Off Elsewhere", "Cancel Up To". The helper below cannot tell, so type
  these.
- A hyphenated word gets one capital: "Pick-up", "Add-ons", "No-show", "Month-end".
- A unit keeps its letters, and words in brackets after a label stay small: "Rate per
  Extra km", "Wait There (minutes)", "IC Number (optional)", "Trip's Price (RM)".
- After a colon the next word takes a capital: "Paused: Class Off".
- A name keeps its own letters: "KLIA2", "WhatsApp Us".

## Where the line falls

- **A lone tick box says what ticking does, so it is a sentence;** a list of choices names
  its options, so they are labels. When a tick box's label is only the name of a thing, the
  name keeps its capitals: "Tour Guide".
- **A message is a sentence even as a page's title:** "We can't find that page", "Page not
  found", "Something went wrong", "Not on Connect yet", "Can't view". So is the title of an
  empty state: "No bookings yet", "Choose a vehicle first".
- **A link inside a sentence is part of the sentence:** "Make a booking for each coach, or
  WhatsApp us and we plan it with you." A link that stands alone after a sentence is a
  button: "Already have an account? Sign In".
- **A greeting that is a page's title is a title:** "Good Afternoon, Fikri" on the
  dashboard and on Connect's home.
- **Connect's landing page is written as sentences,** its headlines and its numbered
  steps: "A fleet of forty, or one good car". The home page's headings are names: "Our
  Services", "Choose Your Destination".
- **No full stop after a page's title** on the website: "My Bookings", "Request Received".
- **A name inside a sentence keeps its capitals:** "Open it from My Bookings", "the Coach
  Charter page", "Set to Pay Later.", "Vehicle Only does not cover drivers." A plain noun
  does not: "Tour guide named.", "Choose the tour guide."
- **A price line is a name, then its sum:** "Extra Road, 2 km × RM 3.00", "Odd Hours,
  +20%".

## In the code

- Fixed text is typed in its case. Nothing re-cases it on the way to the screen.
- A title built from data goes through `titleCase` (`packages/db/src/names.ts`, with the
  list of small words): "More " + "popular places" + " in Langkawi" is "More Popular Places
  in Langkawi", "Add " + "tour guide" is "Add Tour Guide". It touches only a word all in
  small letters. `sentenceCase`, beside it, opens a sentence with a noun: "Tour guide
  named."
- The labels the apps share are in `@repo/db` (`TRIP_CATEGORY_LABELS`,
  `ITEM_STATUS_LABELS`, `VENDOR_FIELD_LABELS` and the like), in Title Case. A sentence
  that wants one small lowers it itself, as the activity lines do.
- What the team types in Manage is shown as typed: a page's headline and intro, FAQ
  questions, blog titles, the footer's headings and links, class and zone names. Code must
  not re-case it ("KLIA2", a Malay name). The team writes those to this rule.
- **What is saved with a booking keeps the letters it was saved with.** A charge's label, a
  revision's summary and its lines, and a reason are kept as written, so a booking from
  before this change shows "Odd-hours surcharge" and a new one "Odd-hours Surcharge". Two
  texts are also matched against saved rows and were left alone: the cancellation fee's
  label (`FEE_LABEL` in `bookings.ts`) and the reasons offered for an agreed price
  (`REASONS` in `BookingSummary.tsx`). `amendSummaryOf` reads a revision's lines in small
  letters, so it reads both.
- Capitals are drawn with the `text-caps` utility, or `uppercase` with one of the three
  named spacings (`tracking-caps`, `tracking-kicker`, `tracking-eyebrow`; see
  `docs/261029-design-tokens.md`). Not `tracking-wide`, not a spacing meant for a title.
- A sub-heading inside a Manage card is `text-sm font-semibold text-ink`, in Title Case, not
  in capitals.

## How it was checked

Every visible string was read out of the three apps and the shared packages by where it
stands (about 3,500), and each kind of place was brought to one case. After the change:
no page title, heading, button, column header, field label or status word of two words or
more is left in sentence case, other than the questions and the messages named above; and
no hint, error, toast or description is in Title Case.

## Not done here

- The spelling pairs "Pick-up"/"Pickup" and "Add-ons"/"Add On" are both in use. A change
  of their own.
- Text stored in the database (above) is fixed by hand in Manage.
