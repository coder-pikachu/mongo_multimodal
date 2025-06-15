// MongoDB script to insert sample questions for a specific project
// Run this in mongosh: mongosh < insert-sample-questions.js

// Connect to your database (adjust connection string as needed)
// use your_database_name

// Project ID to update
const projectId = ObjectId("684ee9b5b8b496a7310b0239");

// Sample questions to insert
const sampleQuestions = [
  "What are the main themes discussed in the documents?",
  "Summarize the key findings from the uploaded images",
  "What patterns or trends can you identify across all the content?",
  "Are there any important recommendations or conclusions?",
  "What are the most significant insights from this project?"
];

// Update the project with sample questions
const result = db.projects.updateOne(
  { _id: projectId },
  {
    $set: {
      sampleQuestions: sampleQuestions,
      updatedAt: new Date()
    }
  }
);

// Print the result
print("Update result:");
print(`Matched documents: ${result.matchedCount}`);
print(`Modified documents: ${result.modifiedCount}`);

if (result.modifiedCount > 0) {
  print("✅ Sample questions successfully added to project!");
  print("Questions added:");
  sampleQuestions.forEach((question, index) => {
    print(`  ${index + 1}. ${question}`);
  });
} else if (result.matchedCount === 0) {
  print("❌ Project not found with the specified ID");
} else {
  print("⚠️  Project found but not modified (questions may already exist)");
}

// Verify the update by querying the project
print("\nVerifying update:");
const project = db.projects.findOne(
  { _id: projectId },
  { name: 1, description: 1, sampleQuestions: 1 }
);

if (project) {
  print(`Project: ${project.name}`);
  print(`Description: ${project.description}`);
  print(`Sample Questions: ${JSON.stringify(project.sampleQuestions, null, 2)}`);
} else {
  print("Project not found for verification");
}