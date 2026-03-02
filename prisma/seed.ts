import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const users = [
  { name: "Admin User", email: "admin@yachtcrm.com", role: "admin", initials: "AU" },
  { name: "James Hartley", email: "james@yachtcrm.com", role: "agent", initials: "JH" },
  { name: "Sophie Miles", email: "sophie@yachtcrm.com", role: "agent", initials: "SM" },
  { name: "Marcus Webb", email: "marcus@yachtcrm.com", role: "agent", initials: "MW" },
  { name: "Claire North", email: "claire@yachtcrm.com", role: "agent", initials: "CN" },
]

const leads = [
  {
    firstName: "Richard", lastName: "Ashworth",
    email: "rashworth@ashworthcapital.com", phone: "+44 7700 123 456",
    company: "Ashworth Capital", jobTitle: "Managing Director",
    status: "qualified", priority: "high",
    leadSource: "referral", budget: "€2,000,000 – €3,500,000",
    vesselInterest: "Sunseeker Predator 74",
    city: "London", country: "United Kingdom",
    notes: "Referred by James Morrison. Looking to upgrade from current 55ft Fairline.",
  },
  {
    firstName: "Elena", lastName: "Vasquez",
    email: "evasquez@gmail.com", phone: "+34 612 345 678",
    mobile: "+34 698 765 432",
    company: "Vasquez Developments", jobTitle: "CEO",
    status: "proposal", priority: "high",
    leadSource: "event", budget: "€1,500,000 – €2,500,000",
    vesselInterest: "Azimut S6",
    city: "Marbella", country: "Spain",
    notes: "Met at Monaco Yacht Show. Very serious buyer, wants to berth in Puerto Banús.",
  },
  {
    firstName: "Tom", lastName: "Brennan",
    email: "tom.brennan@brennangroup.ie", phone: "+353 87 234 5678",
    company: "Brennan Group", jobTitle: "Director",
    status: "contacted", priority: "medium",
    leadSource: "website", budget: "€800,000 – €1,200,000",
    vesselInterest: "Ferretti 550",
    city: "Dublin", country: "Ireland",
    notes: "Submitted enquiry via website. Looking for something for family holidays in the Med.",
  },
  {
    firstName: "Nadia", lastName: "Petrov",
    email: "nadia@petrovholdings.com", phone: "+7 916 345 6789",
    company: "Petrov Holdings", jobTitle: "Owner",
    status: "new", priority: "high",
    leadSource: "referral", budget: "€5,000,000+",
    vesselInterest: "Princess Y85 / Sunseeker 88",
    city: "Monaco", country: "Monaco",
    notes: "Cold referral from broker contact in Monaco. Needs follow-up call.",
  },
  {
    firstName: "David", lastName: "Lam",
    email: "dlam@lamventures.hk", phone: "+852 9123 4567",
    company: "Lam Ventures", jobTitle: "Founder",
    status: "new", priority: "medium",
    leadSource: "social", budget: "€1,000,000 – €1,800,000",
    vesselInterest: "Princess V60",
    city: "Hong Kong", country: "Hong Kong",
    notes: "Found us via Instagram. Interested in something for Phuket charter market.",
  },
  {
    firstName: "Charlotte", lastName: "Beaumont",
    email: "cbeaumont@beaumont-law.fr", phone: "+33 6 12 34 56 78",
    company: "Beaumont Legal", jobTitle: "Partner",
    status: "won", priority: "high",
    leadSource: "referral",
    budget: "€1,200,000",
    vesselInterest: "Azimut 50",
    city: "Nice", country: "France",
    notes: "Deal closed. Azimut 50 delivered April 2024. Follow up for charter management discussion.",
  },
  {
    firstName: "Henrik", lastName: "Larsson",
    email: "h.larsson@larssonfund.se", phone: "+46 70 123 45 67",
    company: "Larsson Fund", jobTitle: "CIO",
    status: "lost", priority: "medium",
    leadSource: "event",
    budget: "€900,000",
    vesselInterest: "Sunseeker Manhattan 55",
    city: "Stockholm", country: "Sweden",
    notes: "Decided to go with competitor. Was price-sensitive. Keep in long-term pipeline.",
  },
  {
    firstName: "Marco", lastName: "Conti",
    email: "marco.conti@contigroup.it", phone: "+39 348 123 4567",
    company: "Conti Group", jobTitle: "Managing Partner",
    status: "contacted", priority: "low",
    leadSource: "cold_call", budget: "€600,000 – €900,000",
    vesselInterest: "Ferretti 450",
    city: "Milan", country: "Italy",
    notes: "Initial call completed. Prefers to be contacted in evenings (CET).",
  },
]

async function main() {
  console.log("🌱 Seeding database...")

  const hashedPassword = await bcrypt.hash("demo1234", 12)

  const createdUsers = []
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password: hashedPassword },
    })
    createdUsers.push(user)
    console.log(`  ✓ User: ${user.name}`)
  }

  await prisma.activity.deleteMany()
  await prisma.lead.deleteMany()

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i]
    const owner = createdUsers[(i % (createdUsers.length - 1)) + 1]

    const created = await prisma.lead.create({
      data: {
        ...lead,
        ownerId: owner.id,
        lastContactedAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
      },
    })

    // Seed some activities
    await prisma.activity.createMany({
      data: [
        {
          leadId: created.id,
          userId: owner.id,
          type: "note",
          content: lead.notes || "Initial contact made.",
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        {
          leadId: created.id,
          userId: owner.id,
          type: "call",
          content: "Introductory call — discussed requirements and timeline.",
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      ],
    })

    console.log(`  ✓ Lead: ${lead.firstName} ${lead.lastName}`)
  }

  console.log("\n✅ Seed complete.")
  console.log("\nLogin credentials (all users):")
  console.log("  Password: demo1234")
  users.forEach((u) => console.log(`  ${u.email}`))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
