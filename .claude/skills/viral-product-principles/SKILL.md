---
name: viral-product-principles
description: Reviews or writes landing pages, marketing copy, pricing, and positioning against Marc Lou's "32 Principles of a Viral Product" (Just Ship It newsletter). Use when the user asks to make a product/landing page "more viral", improve conversion, write hero copy, design pricing, or wants a critique of a marketing page's persuasiveness — not for general UI/code review.
---

# Viral Product Principles

Source: Marc Lou (indie hacker, ShipFast/Photo AI), *Just Ship It* newsletter —
["32 Principles of a Viral Product"](https://newsletter.marclou.com/p/31-principles-of-a-viral-product).
Reproduced here for reference; treat as patterns to weigh, not laws to obey
blindly — the source itself frames them as "a compass, not a checklist."

## Operating Posture

You are reviewing (or writing) a landing page, pricing section, or piece of
marketing copy with a bias toward **clarity and conversion over cleverness**.
Most violations below are sins of vagueness, hedging, or trying to say too
much at once — the fix is almost always to cut, simplify, or be more
concrete, not to add more words.

Not every principle applies to every product. A B2B tool sold via sales calls
doesn't need a hard paywall on day one; a subscription can be the right call
when usage is genuinely recurring. Flag a violation, but let the user decide
if the tradeoff is deliberate — same as respecting a documented design
decision in a code review.

## The 32 Principles

### Positioning & Copy
1. **Copy only you could write** — if a competitor could paste your landing page onto theirs, it's too generic. Write from experience.
2. **Copy stolen from customers** — customers already describe your product better than you do. Write like they talk.
3. **Numbers instead of adjectives** — "fast" is forgettable; "save 4 hours a week" isn't.
4. **No weak words** — "most", "many", "rarely" are unfalsifiable. Make claims people can picture and challenge.
5. **A headline a fifth grader understands** — complexity kills curiosity.
6. **An emotional headline** — people remember feelings, not features. Aim for a laugh, a "wow", or a "what the f*ck is this".
7. **A headline people remember the next day** — write five, test with friends, wait 24h, keep the one that sticks.
8. **A name people remember** — words people already know; skip wordplay and names that need explaining.
9. **Described in under 10 words** — if you can't say it in one sentence, users won't either.
10. **Sells a human desire, not a feature** — money, time, health, status, less pain. Features are just the vehicle.

### The Hero & First Impression
11. **Sold from the hero alone** — 80% never scroll past it. Fix the hero first.
12. **Shows the product before it explains it** — a demo beats paragraphs. Show, don't tell.
13. **One idea per screen** — one screen, one message, nothing else.
14. **Something people haven't seen before** — nobody shares a clone.
15. **OG image treated like a YouTube thumbnail** — often seen more than the site itself. If they don't click, they don't watch.
16. **Empathy before the sell** — describe the problem better than the visitor could, before pitching the solution.

### Trust & Proof
17. **A founder people can see and hear** — a screen recording of a real person beats a corporate promo.
18. **No launch without testimonials** — collect proof before traffic.
19. **Compares itself to competitors** — a simple comparison table on the features customers actually care about.
20. **Lets people try before they buy** — don't hide your best features behind the paywall; put them on the landing page.

### Pricing
21. **More expensive than competitors** — nobody talks about the second-cheapest option. Charge more.
22. **Popcorn Pricing** — three tiers max (Good / Better / Best). Every extra tier is another reason to leave.
23. **Pricing impossible to miss** — put "Pricing" in the header; visitors use it to understand the product, not just the cost.
24. **A hard paywall** — signups don't pay the bills. Ask for payment before asking for data.
25. **No free plan** — free users rarely convert (<3%) and inflate support/server cost.
26. **No subscription unless truly recurring usage** — one-time payments are ~10x easier to sell.

### Call to Action
27. **One call to action** — every extra button creates hesitation; more paths often means fewer people pick any.
28. **A CTA that says what happens next** — "Analyze My Website" beats "Get Started". Remove uncertainty.

### Visual Design
29. **Three colors, max** — black text, white background, one accent color reserved for the buy button. Every added color competes for attention.

### Distribution & Closing
30. **Rides a wave** — build around a trend, technology, or problem people already discuss; the wave markets it for you.
31. **Does one thing** — the more a product does, the less it's remembered for any of them.
32. **Ends with a shareable footer** — 97% won't buy today but might share; people remember what they see last.

## How to Apply This

### When writing copy or a landing page
Draft against the relevant principles above, then self-check the highest-leverage ones first: hero (11–13), headline (5–7), CTA (27–28), pricing (21–26). Cite which principle motivated a specific choice when it's not obvious ("charging above the cheapest competitor, per #21").

### When reviewing an existing page

Produce one table, one row per finding:

| # | Principle violated | Where | Current | Suggested fix |
| --- | --- | --- | --- | --- |
| 1 | #6 Emotional headline | Hero H1 | "The best way to manage tasks" | Lead with the outcome/feeling, not the category |
| 2 | #22 Popcorn Pricing | Pricing section | 5 tiers | Collapse to 3: Good / Better / Best |

Then close with a short verdict: the 2–3 highest-leverage fixes if the page had to ship today, separate from lower-priority polish. Don't flag a principle the user has clearly already made a deliberate, reasoned tradeoff on (e.g., a genuine subscription business, or a B2B tool that needs a demo call instead of self-serve payment) — note the tradeoff instead of re-litigating it.
