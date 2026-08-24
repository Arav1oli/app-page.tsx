# Importing your leads from Monday.com and HubSpot

This guide is written for a broker, not a developer. Follow it top to bottom and
your existing leads will end up in the CRM.

The whole job is three steps:

1. Get a **CSV file** out of Monday.com (and/or HubSpot).
2. Give the file a quick tidy-up in Excel / Numbers / Google Sheets.
3. Run the import and read the report.

You do **not** need to rename your columns to match anything. The importer already
knows the column names Monday and HubSpot use. Anything it doesn't recognise is
kept — it gets copied into the lead's Notes so nothing is lost.

---

## Before you start: make a backup

The CRM's data lives in a single file: `prisma/dev.db`.

Before your first import, make a copy of it. If an import goes wrong, you delete
the new file and put the copy back — five seconds, no harm done.

```
cp prisma/dev.db prisma/dev.db.backup
```

---

## Step 1a — Export your leads from Monday.com

1. Open the board with your leads on it.
2. Look at the very top-right of the board, next to the board name. Click the
   **three dots (⋯)** menu.
3. Choose **Export board to Excel**.
4. Monday emails/downloads you an **.xlsx** file (an Excel file, not a CSV).
   That's fine — you'll convert it in Step 2.

Notes on Monday exports:

- If your board has **groups** (e.g. "New Enquiries", "In Progress", "Closed"),
  the export puts each group in its own block with its own repeated header row.
  You'll clean that up in Step 2.
- If you only want *some* leads, filter the board first — the export respects
  the filters and the columns currently shown in the view.
- If your board hides columns you want (Phone, Budget, etc.), unhide them
  before exporting or they won't be in the file.

## Step 1b — Export your contacts from HubSpot (free)

1. In the top navigation, go to **CRM → Contacts**.
2. Tick the checkbox at the top-left of the table to select all contacts. (A blue
   bar appears saying "All N contacts selected" — click that link if it offers to
   select every contact rather than just this page.)
3. Click **Export** at the top of the table.
4. In the pop-up:
   - **File format:** choose **CSV**.
   - **Columns:** choose **All properties on this view** if your view already
     shows what you need, or **Choose properties** and add: First Name, Last Name,
     Email, Phone Number, Mobile Phone Number, Company Name, Job Title,
     Contact Owner, Lifecycle Stage, Lead Status, Create Date, Last Activity Date,
     City, State/Region, Country, Notes.
5. Click **Export**. HubSpot prepares the file in the background and **emails you
   a download link**. It is also available from the **bell (notifications) icon**
   in the top right, and under **Settings → Import & Export → Exports**.
6. Download it. The link expires after a few days.

**Important limitation:** HubSpot free does not let you export your logged calls,
emails and meetings (the activity timeline) as a spreadsheet. Only the contact
*fields* come across. Anything you typed into a Notes-style property will be
imported into the lead's Notes; the chronological timeline will not. If a
particular lead's history matters, copy it into a Notes column by hand before
exporting.

---

## Step 2 — Tidy the file and save it as CSV

Open the exported file in Excel, Numbers or Google Sheets.

**A. The first row must be your column headings.**

Monday's export usually has the board name (and sometimes a blank row) above the
real headings. Delete those rows so that **row 1 is the row containing "Name",
"Status", "Phone", etc.**

**B. Delete repeated heading rows and group titles.**

If your Monday board had groups, you'll see the heading row repeated part-way
down the file, with group names on their own rows. Delete those extra rows.
Genuinely blank rows are fine — the importer ignores them.

**C. Save as CSV.**

- Excel: **File → Save As** → format **CSV UTF-8 (Comma delimited) (.csv)**.
- Numbers: **File → Export To → CSV**.
- Google Sheets: **File → Download → Comma-separated values (.csv)**.

Put the file somewhere easy to type, e.g. your Desktop.

---

## Step 3 — What the columns should look like

You don't have to rename anything, but this is what the importer looks for.
Matching is case-insensitive and ignores brackets, so `Phone Number (Work)`
is read as `Phone Number`.

| Your column is called… | Goes into |
| --- | --- |
| Lead, Name, Full Name, Contact, Contact Name, Client, Client Name, Customer, Item, Item Name | First name + Last name (split at the first space) |
| First Name, Firstname, Given Name | First name |
| Last Name, Surname, Family Name | Last name |
| Email, E-mail, Email Address, Work Email, Primary Email | Email |
| Phone, Phone Number, Telephone, Tel, Landline, Office/Work/Home Phone | Phone |
| Mobile, Mobile Number, Mobile Phone, Cell, Cell Phone | Mobile |
| Company, Company Name, Associated Company, Business, Organisation, Account Name | Company |
| Job Title, Title, Position, Role | Job title |
| Website, URL, Company Website, Domain | Website |
| LinkedIn, LinkedIn URL, LinkedIn Bio | LinkedIn |
| Status, Lead Status, Stage, Deal Stage, Pipeline, Lifecycle Stage | Status (see the table below) |
| Priority, Urgency, Importance | Priority (High / Medium / Low) |
| Contact Owner, Owner, Assigned To, Assignee, Person, Broker, Agent, Sales Rep | Owner (matched to a CRM user) |
| Source, Lead Source, Original Source, Channel, How did you hear about us | Lead source |
| Looking For, Vessel Interest, Boat of Interest, Interested In, Vessel, Boat, Yacht, Model | Vessel interest |
| Currently Owns, Current Boat, Current Vessel, Existing Boat, Trade In | Notes (as "Currently owns: …") |
| Budget, Budget Range, Price Range, Price, Approx Budget, Deal Amount | Budget |
| Address, Street Address, Address Line 1 | Address |
| City, Town, Suburb, Location | City |
| State, State/Region, Region, Province, County | Address (added after the street address) |
| Country | Country |
| Notes, Note, Comments, Description, Details, Message, Enquiry, Updates | Notes |
| Date of Lead, Enquiry Date, Create Date, Created, Date Created, Date | The lead's created date |
| Last Activity Date, Last Contacted, Last Contact, Last Touch | Last contacted date |

**Anything not in this list is still imported** — it's appended to the lead's
Notes as `Column name: value`, so you can find it later.

### How statuses are translated

Whatever your board calls it, it becomes one of the CRM's six statuses.

| Your label (any capitalisation) | Becomes |
| --- | --- |
| New, New Lead, Lead, Open, Not Started, To Do, Untouched, Incoming, Enquiry, Subscriber | **New Lead** |
| Contacted, Contact Made, In Touch, Attempted to Contact, Follow Up, Working, Working on it, In Progress, Nurturing, Engaged, Appointment Scheduled | **Contacted** |
| Qualified, Qualified Lead, Sales/Marketing Qualified Lead, SQL, MQL, Opportunity, Hot Lead, Inspection Booked, Viewing Booked, Sea Trial | **Qualified** |
| Proposal, Proposal Sent, Quote, Quote Sent, Quoted, Offer, Offer Sent, Under Offer, Negotiation, Contract Sent | **Proposal Sent** |
| Won, Closed Won, Deal Won, Sold, Done, Complete, Customer, Client, Settled | **Won** |
| Lost, Closed Lost, Dead, Unqualified, Not Interested, No Longer Interested, No Response, Stuck, Archived, Junk, Bought Elsewhere | **Lost** |
| *blank, or anything unrecognised* | **New Lead** (and the original label is saved into Notes) |

Labels with a prefix work too — "Stage 3 - Qualified" is read as Qualified.

---

## Step 4 — Run the import

Open a terminal in the project folder. **Always do a dry run first** — it reads
your file and tells you exactly what it would do, without saving anything.

```
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/import-csv.ts ~/Desktop/monday-leads.csv --dry-run
```

Read the report (see the next section). When you're happy, run the same command
**without** `--dry-run`:

```
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/import-csv.ts ~/Desktop/monday-leads.csv
```

### Useful options

| Option | What it does |
| --- | --- |
| `--dry-run` | Report only, save nothing. Always use this first. |
| `--owner "Sophie Miles"` | Who to assign leads to when the CSV's owner name doesn't match a CRM user. Accepts a name, an email or initials. |
| `--date-format mdy` | Use this **only if your dates are American** (month first). See "Assumptions" below. |
| `--status contacted` | Status for rows with a blank or unrecognised status. Default: `new`. |
| `--source website` | Lead source for rows with no source column, e.g. if the whole file came from your website enquiry form. |
| `--allow-duplicates` | Import rows even if they look like a lead you already have. Off by default. |
| `--no-extra-notes` | Don't copy unrecognised columns into the Notes. |
| `--delimiter ";"` | Force the column separator if your file uses semicolons. Normally detected automatically. |
| `--json` | Print the report as raw JSON (for a developer). |

Run one file at a time. Doing Monday first and HubSpot second is fine — the
second run will spot people who exist in both and skip them.

---

## Step 5 — Reading the report

A typical run looks like this:

```
📄 /Users/adrian/Desktop/monday-leads.csv
   214 data rows, 13 columns, delimiter ","

Import complete

  Rows read .............. 214
  Leads created .......... 198
  Skipped (duplicates) ... 14
  Failed (errors) ........ 2
  Rows with warnings ..... 23

Column mapping:
  Lead                         -> fullName
  Phone number                 -> phone
  Random Column                -> (not imported — kept in notes)
  ...

Rows needing attention:
  Line 47 — (no name): ERROR Row has no name and no email address — nothing to create a lead from
  Line 88 — Elena Vasquez <evasquez@gmail.com>: SKIPPED Duplicate email (evasquez@gmail.com) — already in the CRM
  Line 102 — Solo Smith: ok
      warning: Unrecognised status "Waiting on finance" — defaulted to "new"
```

What each part means:

- **Column mapping** — check this first. It tells you where each of your columns
  landed. If something important says *"(not imported — kept in notes)"*, rename
  that column in your spreadsheet to one of the names in the table above and
  re-run.
- **ERROR** — that row was *not* imported. The only fatal problem is a row with
  no name *and* no email; there is nothing to make a lead out of. Fix those rows
  in the spreadsheet and re-run the file — the rows that already worked will be
  skipped as duplicates, so you can safely run the same file twice.
- **SKIPPED** — the row looks like someone you already have. It says whether the
  match was on **email** or on **name**, and whether the match is *already in the
  CRM* or *the same as line N* (a duplicate inside your own file). Nothing was
  changed on the existing lead.
- **warning** — the row *was* imported, but something was odd and we made a
  decision for you. Warnings never stop an import. The common ones:
  - *Unrecognised status* — imported as New Lead, original label saved in Notes.
  - *Could not read the date* — the lead is dated today, original text in Notes.
  - *Not a valid email address* — the lead is imported with no email, and the
    original text is kept in Notes.
  - *Could not match owner "X"* — that person isn't a user in this CRM yet.
    Either add them as a user and re-run, or use `--owner` to pick a fallback.
- **Line numbers** are the real line numbers in the CSV file, so you can open the
  file in a text editor and jump straight to them. Note that a lead with a
  multi-line note occupies more than one line, so these won't always match your
  spreadsheet's row numbers exactly.

**"Line 1"** is your header row, so the first lead is normally line 2.

---

## Assumptions you should check against your real export

These are the judgement calls the importer makes. Skim them once before your
first real import.

1. **Dates are day-first (31/12/2024 = 31 December).** This is the Australian /
   UK convention and is the default. HubSpot exports in a US locale are
   month-first — if your Create Date column looks like `12/31/2024`, add
   `--date-format mdy`. Unambiguous dates (`2024-12-31`, `31 Dec 2024`) are read
   correctly either way. Check a couple of leads' dates after a dry run.
2. **Names split at the first space.** "Mary Jane Watson" becomes first name
   "Mary", last name "Jane Watson". "Cher" becomes first name "Cher" with a blank
   last name. "Ashworth, Richard" is understood as Richard Ashworth.
3. **"Currently Owns" goes into Notes.** The CRM has no dedicated
   "current vessel" field, so it is written into the notes as
   `Currently owns: Fairline 55`. If you want it as a real field, that's a small
   schema change — ask.
4. **"State/Region" goes into the Address field**, joined to the street address
   if there is one. The CRM stores Address / City / Country only.
5. **Duplicates are matched on email**, and on **first + last name** when the row
   has no email at all. Two different people with the same name and no email will
   look like a duplicate — check the SKIPPED list.
6. **The importer only adds, it never updates.** Running the same file twice
   won't create doubles, but it also won't refresh a lead whose details changed
   in Monday since your last run.
7. **Owners must already exist as CRM users**, matched on their full name, email
   or initials. Add your brokers as users before importing so leads land on the
   right person.
8. **Activity history is not imported** — only the fields in your spreadsheet.
   See the HubSpot note above.
9. **The "Title" column is read as a job title**, not as a name. If your Monday
   board's first column is literally called "Title", rename it to "Lead" or
   "Name" before exporting.

---

## For developers

The same logic is available over HTTP for a future import screen:

```
POST /api/leads/import
```

Requires a logged-in session (401 otherwise), exactly like `/api/leads`. Send
either `Content-Type: text/csv` with the raw file body, or JSON:

```json
{
  "csv": "Lead,Email\nJane Doe,jane@example.com\n",
  "dryRun": true,
  "defaultOwnerId": "<user id>",
  "options": { "dateFormat": "DMY", "skipDuplicates": true }
}
```

It responds with the same summary the CLI prints: `created`,
`skippedDuplicates`, `failed`, the resolved column `mapping`, and a per-row
`rows[]` array. A row that fails to save is reported and the import continues.

The parsing, mapping and normalisation live in `lib/import.ts` and have no
dependency on Next.js, React or Prisma, so they can be reused by a UI wizard.
