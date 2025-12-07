import { db } from "./data/db";
import { prompts } from "./data/db/schema";

const defaultPrompts = [
  {
    title: "Simple Todo App",
    description: `Create a beautiful todo app with the following features:
- Add, edit, and delete tasks
- Mark tasks as complete/incomplete
- Filter tasks by status (all, active, completed)
- Persist tasks to localStorage
- Clean, modern UI with smooth animations`,
    isDefault: true,
  },
  {
    title: "Weather Dashboard",
    description: `Build a weather dashboard that displays:
- Current weather conditions with temperature, humidity, and wind speed
- A 5-day forecast view
- Search functionality to look up weather by city name
- Use placeholder/mock data for the weather API
- Display weather icons and appropriate color schemes based on conditions`,
    isDefault: true,
  },
  {
    title: "Kanban Board",
    description: `Create a Kanban-style task management board with:
- Three columns: To Do, In Progress, Done
- Drag and drop functionality to move cards between columns
- Add new cards with title and description
- Delete cards
- Cards should show creation date
- Responsive design that works on mobile`,
    isDefault: true,
  },
  {
    title: "Expense Tracker",
    description: `Build an expense tracking application that includes:
- Add new expenses with amount, category, and date
- Display a list of all expenses with total
- Filter expenses by category and date range
- Show spending breakdown by category using a chart
- Calculate and display monthly totals
- Persist data to localStorage`,
    isDefault: true,
  },
  {
    title: "Pomodoro Timer",
    description: `Create a Pomodoro productivity timer with:
- 25-minute work sessions and 5-minute breaks
- Start, pause, and reset controls
- Visual progress indicator (circular or linear)
- Audio notification when timer completes
- Session counter to track completed pomodoros
- Customizable timer durations in settings`,
    isDefault: true,
  },
  {
    title: "Contact List Manager",
    description: `Build a contact management application featuring:
- Add contacts with name, email, phone, and avatar
- Edit and delete existing contacts
- Search contacts by name or email
- Sort contacts alphabetically or by date added
- Group contacts by first letter
- Responsive grid/list view toggle`,
    isDefault: true,
  },
  {
    title: "Quiz Application",
    description: `Create an interactive quiz app with:
- Multiple choice questions with 4 options each
- Progress indicator showing current question number
- Timer for each question (30 seconds)
- Score tracking and final results screen
- Option to retry the quiz
- Use at least 5 sample questions about any topic`,
    isDefault: true,
  },
  {
    title: "Markdown Notes Editor",
    description: `Build a markdown notes application with:
- Split-pane view: editor on left, preview on right
- Support basic markdown (headers, bold, italic, lists, code blocks)
- Save multiple notes with titles
- List of saved notes in a sidebar
- Delete notes functionality
- Persist notes to localStorage`,
    isDefault: true,
  },
];

async function seed() {
  console.log("🌱 Seeding database with default prompts...");

  try {
    // Check if prompts already exist
    const existingPrompts = await db.select().from(prompts);

    if (existingPrompts.length > 0) {
      console.log(
        `⚠️  Found ${existingPrompts.length} existing prompts. Skipping seed.`,
      );
      console.log("   To re-seed, delete existing prompts first.");
      return;
    }

    // Insert default prompts
    for (const prompt of defaultPrompts) {
      await db.insert(prompts).values(prompt);
      console.log(`   ✓ Added: "${prompt.title}"`);
    }

    console.log(`\n✅ Successfully seeded ${defaultPrompts.length} prompts!`);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("\n🎉 Seed completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
