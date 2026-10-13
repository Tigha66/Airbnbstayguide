# Casa Demo - Full Product Walkthrough

This is the ready-made demo host and property for testing the entire StayGuide product flow on production.

## Quick Start

### Host (Admin)
- **URL:** https://www.getstayguide.com/login
- **Email:** demo-tester-202610132145@getstayguide.com
- **Password:** StayGuide-Demo-202610132145!

### Guest
- **Test Link:** https://www.getstayguide.com/g/casa-demo-2bwl

## What's Included in Casa Demo

The Casa Demo property is a fully enriched test property with:

### Property Information
- **Address:** Included for full context
- **WiFi Setup:** Network name and password configured
- **Check-in/Check-out:** Times and procedures documented
- **Amenities:** Detailed equipment and feature list

### Special Features
- **House Manual:** Pre-loaded with structured sections
- **Guest Extras:** 
  - Late checkout (4-hour extension)
  - Welcome breakfast package
  - Airport transfer service
  - Each with pricing and approval workflow

### Concierge Setup
- Pre-configured for AI responses with citations
- Fallback keyword search for demo/offline
- Question escalation to host inbox
- Multiple language support (EN, FR, ES, DE, AR)

## Testing Workflow (17-Step Walkthrough)

### 1-3. Account & Authentication
1. **Sign in** with the demo credentials above
2. Verify dashboard loads and shows "Casa Demo" property
3. Check that "View guest experience" link opens the property (not the sample demo)

### 4-5. Property & Guide
4. Open the property to view the guide structure
5. Verify all sections and amenities are visible

### 6-8. Guest Experience (Phone View)
6. Open the guest link in a mobile browser or use dev tools (F12 → device toolbar)
7. Scroll through the full guide as a guest would
8. Verify all information displays correctly on mobile

### 9-11. Concierge Q&A
9. **Ask a known question** (e.g., "What's the WiFi password?")
   - Expect: Answer from guide with citation of the section
   - Example: "The WiFi network is [name] and the password is [password]. (WiFi Setup)"

10. **Ask an unknown question** (e.g., "Write me a business plan")
    - Expect: Message escalated to host inbox
    - Guest sees: "I'm sorry, that isn't covered in the guide. I've passed your question to your host, who will reply here soon."

11. **Ask a greeting** (e.g., "Hello")
    - Expect: Polite decline (not in guide context)

### 12-13. Host Inbox & Reply
12. **On host dashboard**, open "Guest inbox" tab
    - Verify the escalated question appears
    - Verify guest name and timestamp

13. **Click reply** and send a message
    - Example: "Thanks for asking! Here's the info..."
    - Verify "CHANGES SAVED" appears in header

### 14-15. Guest Sees Reply
14. **Switch back to guest view** (refresh if needed)
    - Verify the host's reply appears in the thread
    - Timeline shows guest question → host reply

15. **Test the "Extras & upsells" request flow**
    - Guest clicks an extra (e.g., "Welcome Breakfast")
    - Sees: "Request sent! Your host will confirm and explain how to pay."
    - Host sees: New extras request in "Extras & upsells" tab

### 16-17. Admin & Logout
16. **Check Analytics**
    - Open "Analytics" tab
    - Verify conversation count, messages, and guest engagement metrics

17. **Verify Stripe integration** (if live mode)
    - Open "Plans & billing"
    - Check subscription status and payment methods

18. **Sign out**
    - Verify API is now locked (guest chat should not work)
    - Verify demo mode still accessible on homepage

## What Each Page Tests

| Page | Tests | Expected Behavior |
|------|-------|-------------------|
| `/dashboard` | Overview, property list, quick stats | Shows Casa Demo, all sections loaded |
| `/dashboard/properties` | Property edit, guide structure | Can view/edit sections and amenities |
| `/g/casa-demo-2bwl` | Guest view, mobile responsive | Guide fully visible, chat functional |
| `/dashboard/inbox` | Concierge escalations, host replies | Shows questions and conversation history |
| `/dashboard/extras` | Extras request approval | Shows pending and approved requests |
| `/dashboard/analytics` | Conversation stats | Counts match actual Q&A activity |
| `/dashboard/billing` | Subscription and payment | Shows current plan and Stripe status |
| `/api/v1/status` | Health check (curl or browser) | All services report their status |

## Known Limitations in Demo Mode

- **AI Concierge:** Keyword-based fallback (not full AI) unless HF_TOKEN/Groq configured
- **Email Delivery:** Not sent in demo (check `/admin` for logs)
- **Analytics:** Real-time only (no historical data pre-populated)
- **Stripe:** In test mode (no real charges)

## Cleanup

When done testing, delete the account from the host dashboard:
1. Open "Settings" tab
2. Scroll to "Delete account"
3. Confirm deletion

This removes Casa Demo from production and clears the demo user.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Chat doesn't respond | Check `/api/v1/status` → AI section. If "not answering", the AI provider is not configured (see AGENTS.md for Hugging Face/Groq setup) |
| Guest link broken | Copy the link from dashboard "Share kit" instead of using this doc (URL may change) |
| Host reply doesn't appear in guest view | Wait 2-3 seconds and refresh guest browser. Check host dashboard → "CHANGES SAVED" confirmed. |
| Stripe checkout fails | Verify you're in test mode. Use test card `4242 4242 4242 4242`, any future expiry, any CVC. |

## Additional Resources

- **Product Demo:** Start at https://www.getstayguide.com (homepage walkthrough)
- **API Status:** https://www.getstayguide.com/api/v1/status (JSON health check)
- **Bug Reports:** Note the exact step where the issue occurs and any error messages from browser console (F12)

---

**Updated:** 2026-10-13  
**Casa Demo Property ID:** casa-demo-2bwl  
**Test User Email:** demo-tester-202610132145@getstayguide.com
