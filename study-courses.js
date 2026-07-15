const COURSE_BUTTONS = {
  reading: document.getElementById("study-course-reading"),
  writing: document.getElementById("study-course-writing"),
  math: document.getElementById("study-course-math")
};

const practiceGridEl = document.getElementById("study-practice-grid");
const levelGridEl = document.getElementById("study-level-grid");
const subjectTitleEl = document.getElementById("study-subject-title");
const subjectCopyEl = document.getElementById("study-subject-copy");
const practiceTitleEl = document.getElementById("study-practice-title");
const directionsEl = document.getElementById("study-directions");
const currentCourseEl = document.getElementById("study-current-course");
const currentPracticeEl = document.getElementById("study-current-practice");
const currentLevelEl = document.getElementById("study-current-level");
const questionNumberEl = document.getElementById("study-question-number");
const correctCountEl = document.getElementById("study-correct-count");
const wrongCountEl = document.getElementById("study-wrong-count");
const promptLabelEl = document.getElementById("study-prompt-label");
const dialogueBlockEl = document.getElementById("study-dialogue-block");
const wordPromptEl = document.getElementById("study-word-prompt");
const questionCopyEl = document.getElementById("study-question-copy");
const answerGridEl = document.getElementById("study-answer-grid");
const signalEl = document.getElementById("study-signal-light");
const statusEl = document.getElementById("study-status-text");
const nextQuestionEl = document.getElementById("study-next-question");
const resetScoreEl = document.getElementById("study-reset-score");

const LEVEL_ORDER = ["easy", "medium", "hard"];
const LEVEL_LABELS = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard"
};

const SYNONYM_BANK = {
  easy: [
    { word: "bright", correct: "shiny", wrongChoices: ["quiet", "thin", "slow", "rough"], explanation: "Bright and shiny both describe something full of light." },
    { word: "tiny", correct: "small", wrongChoices: ["angry", "smooth", "empty", "loud"], explanation: "Tiny means very small." },
    { word: "glad", correct: "happy", wrongChoices: ["heavy", "warm", "early", "curly"], explanation: "Glad means happy or pleased." },
    { word: "begin", correct: "start", wrongChoices: ["follow", "shake", "guess", "whisper"], explanation: "Begin and start mean to do the first part of something." },
    { word: "quiet", correct: "silent", wrongChoices: ["crowded", "shallow", "careful", "speedy"], explanation: "Quiet means making little or no sound." },
    { word: "rapid", correct: "fast", wrongChoices: ["plain", "young", "empty", "sleepy"], explanation: "Rapid means fast or quick." },
    { word: "neat", correct: "tidy", wrongChoices: ["messy", "sleepy", "curved", "stormy"], explanation: "Neat often means clean and tidy." },
    { word: "brave", correct: "bold", wrongChoices: ["soft", "tiny", "late", "careless"], explanation: "Brave and bold both describe someone who shows courage." }
  ],
  medium: [
    { word: "ancient", correct: "old", wrongChoices: ["active", "gentle", "polite", "sudden"], explanation: "Ancient describes something from a very old time." },
    { word: "reluctant", correct: "unwilling", wrongChoices: ["joyful", "helpful", "serious", "famous"], explanation: "Reluctant means unwilling or not eager." },
    { word: "expand", correct: "stretch", wrongChoices: ["repair", "measure", "notice", "divide"], explanation: "Expand means to stretch or grow larger." },
    { word: "vivid", correct: "lively", wrongChoices: ["formal", "careless", "narrow", "bitter"], explanation: "Vivid can mean bright, strong, or lively." },
    { word: "drowsy", correct: "sleepy", wrongChoices: ["hungry", "balanced", "common", "timid"], explanation: "Drowsy means sleepy." },
    { word: "scarce", correct: "rare", wrongChoices: ["friendly", "colorful", "steady", "massive"], explanation: "Scarce means hard to find or rare." },
    { word: "fragile", correct: "delicate", wrongChoices: ["simple", "clever", "careful", "silent"], explanation: "Fragile means delicate and easy to break." },
    { word: "vanish", correct: "disappear", wrongChoices: ["announce", "collect", "improve", "settle"], explanation: "Vanish means to disappear from sight." }
  ],
  hard: [
    { word: "covenant", correct: "agreement", wrongChoices: ["club", "law", "habit", "symbol"], explanation: "A covenant is a serious promise or agreement." },
    { word: "lucid", correct: "clear", wrongChoices: ["fragile", "restless", "noble", "costly"], explanation: "Lucid means clear and easy to understand." },
    { word: "frugal", correct: "thrifty", wrongChoices: ["wasteful", "awkward", "cheerful", "famous"], explanation: "Frugal describes someone careful with money." },
    { word: "obscure", correct: "hidden", wrongChoices: ["famous", "honest", "measured", "eager"], explanation: "Obscure means not well known or hidden from notice." },
    { word: "impartial", correct: "neutral", wrongChoices: ["excited", "ordinary", "strict", "fortunate"], explanation: "Impartial means neutral and fair." },
    { word: "meticulous", correct: "precise", wrongChoices: ["careless", "timid", "rested", "furious"], explanation: "Meticulous means very careful and precise." },
    { word: "ambiguous", correct: "unclear", wrongChoices: ["bright", "short", "truthful", "gentle"], explanation: "Ambiguous means open to more than one meaning." },
    { word: "feasible", correct: "possible", wrongChoices: ["fragile", "formal", "urgent", "ancient"], explanation: "Feasible means possible to do." }
  ]
};

const SENTENCE_COMPLETION_BANK = {
  easy: [
    {
      sentence: "Carl thought the angry ___________ was fun to watch.",
      correctChoices: ["quarrel", "argument", "dispute"],
      wrongChoices: ["celebration", "invention", "nighttime", "backpack", "library"],
      explanation: "Quarrel means a fight or argument, so it fits the idea of something angry."
    },
    {
      sentence: "We brought an umbrella because the sky looked ___________.",
      correctChoices: ["stormy", "rainy", "dark"],
      wrongChoices: ["musical", "sleepy", "wooden", "fuzzy", "tiny"],
      explanation: "A stormy or rainy sky is a good reason to bring an umbrella."
    },
    {
      sentence: "The puppy was so ___________ that it chased every leaf in the yard.",
      correctChoices: ["playful", "energetic", "lively"],
      wrongChoices: ["ancient", "silent", "square", "frozen", "empty"],
      explanation: "A playful or energetic puppy would chase leaves."
    },
    {
      sentence: "After running two laps, Mia felt ___________ and needed water.",
      correctChoices: ["tired", "exhausted", "winded"],
      wrongChoices: ["shiny", "careful", "polite", "hollow", "spotless"],
      explanation: "Someone who has just run laps would feel tired."
    },
    {
      sentence: "The classroom became ___________ when the principal entered.",
      correctChoices: ["silent", "quiet", "still"],
      wrongChoices: ["spicy", "crooked", "stormy", "colorful", "playful"],
      explanation: "A room often becomes quiet when an important person enters."
    },
    {
      sentence: "Our team worked together to ___________ the puzzle before the bell rang.",
      correctChoices: ["solve", "finish", "complete"],
      wrongChoices: ["whisper", "borrow", "decorate", "balance", "forget"],
      explanation: "You solve or complete a puzzle."
    }
  ],
  medium: [
    {
      sentence: "Jordan gave a ___________ explanation, so everyone understood the plan.",
      correctChoices: ["clear", "detailed", "precise"],
      wrongChoices: ["restless", "noisy", "fragile", "distant", "sudden"],
      explanation: "A clear or detailed explanation helps people understand."
    },
    {
      sentence: "Because money was ___________, the club planned a modest event.",
      correctChoices: ["scarce", "limited", "tight"],
      wrongChoices: ["shiny", "gentle", "seasonal", "brilliant", "towering"],
      explanation: "If money is scarce or limited, people spend carefully."
    },
    {
      sentence: "The map was so ___________ that we took the wrong trail twice.",
      correctChoices: ["confusing", "unclear", "misleading"],
      wrongChoices: ["helpful", "straight", "polite", "silent", "modern"],
      explanation: "An unclear or confusing map can cause wrong turns."
    },
    {
      sentence: "The scientist made a ___________ observation before recording the result.",
      correctChoices: ["careful", "precise", "detailed"],
      wrongChoices: ["reckless", "sleepy", "ordinary", "speedy", "blank"],
      explanation: "Scientific observations should be careful and precise."
    },
    {
      sentence: "After the storm, volunteers helped ___________ the damaged playground.",
      correctChoices: ["repair", "restore", "rebuild"],
      wrongChoices: ["ignore", "borrow", "compare", "melt", "announce"],
      explanation: "Repairing or restoring fits something that was damaged."
    },
    {
      sentence: "The audience remained ___________ during the piano solo.",
      correctChoices: ["attentive", "focused", "quiet"],
      wrongChoices: ["jealous", "jagged", "massive", "careless", "random"],
      explanation: "People usually stay attentive and quiet during a performance."
    }
  ],
  hard: [
    {
      sentence: "The judge remained ___________ and listened carefully to both sides.",
      correctChoices: ["impartial", "neutral", "fair"],
      wrongChoices: ["furious", "careless", "cheerful", "secretive", "fragile"],
      explanation: "A judge should be impartial, meaning fair and neutral."
    },
    {
      sentence: "The committee finally reached a ___________ after hours of debate.",
      correctChoices: ["consensus", "agreement", "decision"],
      wrongChoices: ["celebration", "puzzle", "detour", "rumor", "sketch"],
      explanation: "Consensus means a group agreement."
    },
    {
      sentence: "The lecture was so ___________ that even the hardest idea felt simple.",
      correctChoices: ["lucid", "clear", "understandable"],
      wrongChoices: ["ancient", "scarce", "awkward", "careless", "stormy"],
      explanation: "A lucid lecture is clear and easy to understand."
    },
    {
      sentence: "Her notes were so ___________ that she caught every tiny mistake.",
      correctChoices: ["meticulous", "precise", "thorough"],
      wrongChoices: ["messy", "sleepy", "reckless", "fragile", "casual"],
      explanation: "Meticulous notes are very careful and detailed."
    },
    {
      sentence: "The historian searched ___________ records that few people had ever read.",
      correctChoices: ["obscure", "hidden", "rare"],
      wrongChoices: ["ordinary", "playful", "modern", "cheerful", "steady"],
      explanation: "Obscure records are hidden or not well known."
    },
    {
      sentence: "The engineering team chose the most ___________ design for the bridge.",
      correctChoices: ["feasible", "practical", "possible"],
      wrongChoices: ["impartial", "silent", "ancient", "fragile", "sleepy"],
      explanation: "A feasible design is one that can realistically be built."
    }
  ]
};

const GUESS_THE_SENTENCE_BANK = {
  easy: [
    {
      prompt: "Select the most likely response that Alex should say.",
      dialogue: [
        { speaker: "Lisa", text: "I heard that Carl is hosting a party tonight." },
        { speaker: "Alex", text: "I'm going!" },
        { speaker: "Lisa", text: "My parents won't let me go, they say it's too late." }
      ],
      correctChoice: "I'm sorry they won't let you go. I'll tell you all about it after the party.",
      wrongChoices: [
        "Too bad for you.",
        "The food will probably be amazing, and I cannot wait to leave.",
        "Bye!"
      ],
      explanation: "The best answer is kind and responds directly to Lisa's problem."
    },
    {
      prompt: "Select the most likely response that Maya should say.",
      dialogue: [
        { speaker: "Noah", text: "I studied for the quiz, but I still feel nervous." },
        { speaker: "Maya", text: "You prepared a lot." },
        { speaker: "Noah", text: "I hope that is enough." }
      ],
      correctChoice: "I think you'll do well. Just stay calm and do your best.",
      wrongChoices: [
        "You should probably give up now.",
        "I like pizza after school.",
        "Why are pencils made of wood?"
      ],
      explanation: "A likely response should encourage Noah and match the conversation."
    },
    {
      prompt: "Select the most likely response that Emma should say.",
      dialogue: [
        { speaker: "Jay", text: "I dropped my notebook in a puddle." },
        { speaker: "Emma", text: "Oh no." },
        { speaker: "Jay", text: "Now the pages are sticking together." }
      ],
      correctChoice: "That is rough. Maybe you can dry it with paper towels and a fan.",
      wrongChoices: [
        "That is the funniest thing I have heard today.",
        "My backpack is blue.",
        "Let's start singing right now."
      ],
      explanation: "The best response shows concern and gives a helpful idea."
    },
    {
      prompt: "Select the most likely response that Ben should say.",
      dialogue: [
        { speaker: "Aria", text: "I finally finished my book report." },
        { speaker: "Ben", text: "Nice!" },
        { speaker: "Aria", text: "It took me all afternoon." }
      ],
      correctChoice: "That sounds like a lot of work. You should be proud of finishing it.",
      wrongChoices: [
        "Books are rectangular.",
        "I forgot what we were talking about.",
        "Then you should throw it away."
      ],
      explanation: "A likely response matches Aria's effort and gives a supportive comment."
    }
  ],
  medium: [
    {
      prompt: "Select the most likely response that Daniel should say.",
      dialogue: [
        { speaker: "Sofia", text: "Our group project is due tomorrow, and two slides are still missing." },
        { speaker: "Daniel", text: "I can help tonight." },
        { speaker: "Sofia", text: "Really? That would save us." }
      ],
      correctChoice: "Sure. Send me the outline, and I'll finish the missing slides before dinner.",
      wrongChoices: [
        "Actually, I was only joking.",
        "Did you know giraffes sleep very little?",
        "Maybe just tell the teacher it disappeared."
      ],
      explanation: "The best response stays responsible and follows through on the offer to help."
    },
    {
      prompt: "Select the most likely response that Olivia should say.",
      dialogue: [
        { speaker: "Marcus", text: "Coach moved tryouts to six in the morning." },
        { speaker: "Olivia", text: "That is early." },
        { speaker: "Marcus", text: "I need to set three alarms." }
      ],
      correctChoice: "Good idea. You could also set your clothes out tonight so the morning feels easier.",
      wrongChoices: [
        "You should probably sleep through it.",
        "My favorite number is six.",
        "No mornings have ever happened before."
      ],
      explanation: "A likely response gives a sensible suggestion that fits Marcus's concern."
    },
    {
      prompt: "Select the most likely response that Ava should say.",
      dialogue: [
        { speaker: "Leo", text: "I think I answered the last problem wrong on the test." },
        { speaker: "Ava", text: "That happens sometimes." },
        { speaker: "Leo", text: "I keep replaying it in my head." }
      ],
      correctChoice: "Try not to stress too much. One question probably will not decide everything.",
      wrongChoices: [
        "You should panic immediately.",
        "Can a turtle climb a ladder?",
        "I never think about tests at all ever."
      ],
      explanation: "The best answer reassures Leo and fits the topic."
    },
    {
      prompt: "Select the most likely response that Ethan should say.",
      dialogue: [
        { speaker: "Nora", text: "My little brother erased my drawing by accident." },
        { speaker: "Ethan", text: "Ouch." },
        { speaker: "Nora", text: "I worked on it for an hour." }
      ],
      correctChoice: "I would be upset too. Maybe you can redo the parts you liked best and make it even stronger.",
      wrongChoices: [
        "That means art is impossible forever.",
        "The sky is probably green today.",
        "Just erase his homework back."
      ],
      explanation: "A thoughtful response shows empathy and offers a constructive idea."
    }
  ],
  hard: [
    {
      prompt: "Select the most likely response that Priya should say.",
      dialogue: [
        { speaker: "Evan", text: "The science fair judge asked a question I could not answer." },
        { speaker: "Priya", text: "That sounds uncomfortable." },
        { speaker: "Evan", text: "I knew the experiment, but my mind went blank." }
      ],
      correctChoice: "That can happen under pressure. If it comes up again, explain what you do know and how you would find the rest.",
      wrongChoices: [
        "Then the project must have been a disaster.",
        "I wonder how many stairs are in the building.",
        "Next time, refuse to answer anything."
      ],
      explanation: "The best answer is thoughtful, realistic, and gives a mature strategy."
    },
    {
      prompt: "Select the most likely response that Mateo should say.",
      dialogue: [
        { speaker: "Chloe", text: "I want to join debate, but I am worried I speak too quietly." },
        { speaker: "Mateo", text: "You already make strong points in class." },
        { speaker: "Chloe", text: "I just need more confidence when people are watching." }
      ],
      correctChoice: "You could practice with a small group first. Confidence usually grows when the skill feels familiar.",
      wrongChoices: [
        "Then debate is probably not for you.",
        "Maybe whisper even more softly.",
        "Confidence is a kind of sandwich."
      ],
      explanation: "A likely response would be encouraging and give a practical next step."
    },
    {
      prompt: "Select the most likely response that Harper should say.",
      dialogue: [
        { speaker: "Zane", text: "I promised I would help after school, but now I also have soccer practice." },
        { speaker: "Harper", text: "That is a tough overlap." },
        { speaker: "Zane", text: "I do not want to let either person down." }
      ],
      correctChoice: "Tell them as soon as possible and be honest about the conflict. Then see if you can help at another time.",
      wrongChoices: [
        "Ignore both of them and hope it works out.",
        "Choose whichever one has better snacks.",
        "Pretend time no longer exists."
      ],
      explanation: "The best response handles the conflict responsibly and respectfully."
    },
    {
      prompt: "Select the most likely response that Riley should say.",
      dialogue: [
        { speaker: "Tessa", text: "My speech is done, but it still sounds stiff when I read it aloud." },
        { speaker: "Riley", text: "Sometimes writing sounds different than speaking." },
        { speaker: "Tessa", text: "I want it to feel more natural." }
      ],
      correctChoice: "Try reading each paragraph out loud and changing any part that does not sound like your real voice.",
      wrongChoices: [
        "Make every sentence twice as long.",
        "You should probably stop practicing now.",
        "Speeches only work if they rhyme."
      ],
      explanation: "A likely response should be specific, helpful, and connected to her goal."
    }
  ]
};

const PUNCTUATION_BANK = {
  easy: [
    {
      prompt: "Choose the sentence with the best punctuation.",
      correctChoice: "Maya, please close the door.",
      wrongChoices: ["Maya please close the door.", "Maya please close the door!", "maya, please close the door."],
      explanation: "A name being spoken to directly should be separated with a comma."
    },
    {
      prompt: "Choose the sentence with the best punctuation.",
      correctChoice: "Did you finish your homework?",
      wrongChoices: ["Did you finish your homework.", "did you finish your homework?", "Did you finish your homework"],
      explanation: "A direct question ends with a question mark and starts with a capital letter."
    },
    {
      prompt: "Choose the sentence with the best punctuation.",
      correctChoice: "We packed apples, crackers, and juice for the trip.",
      wrongChoices: ["We packed apples crackers, and juice for the trip.", "We packed apples, crackers and juice for the trip?", "we packed apples, crackers, and juice for the trip."],
      explanation: "Items in a list need commas, and the sentence starts with a capital letter."
    },
    {
      prompt: "Choose the sentence with the best punctuation.",
      correctChoice: "After lunch, we went outside.",
      wrongChoices: ["After lunch we went outside.", "after lunch, we went outside.", "After lunch, we went outside!"],
      explanation: "An introductory phrase is often followed by a comma."
    }
  ],
  medium: [
    {
      prompt: "Choose the sentence with the best punctuation.",
      correctChoice: "On Friday, April 11, we will visit the museum.",
      wrongChoices: ["On Friday April 11 we will visit the museum.", "On Friday, April 11 we will visit the museum?", "on Friday, April 11, we will visit the museum."],
      explanation: "Dates inside a sentence are set off with commas."
    },
    {
      prompt: "Choose the sentence with the best punctuation.",
      correctChoice: "\"Be careful,\" Dad said, \"the floor is wet.\"",
      wrongChoices: ["\"Be careful\" Dad said, \"the floor is wet.\"", "\"Be careful,\" Dad said \"the floor is wet.\"", "\"Be careful\", Dad said, \"the floor is wet.\""],
      explanation: "Quoted speech needs commas and quotation marks in the right places."
    },
    {
      prompt: "Choose the sentence with the best punctuation.",
      correctChoice: "Although it was raining, the game continued.",
      wrongChoices: ["Although it was raining the game continued.", "although it was raining, the game continued.", "Although it was raining, the game continued?"],
      explanation: "A dependent clause at the beginning is followed by a comma."
    },
    {
      prompt: "Choose the sentence with the best punctuation.",
      correctChoice: "My sister's backpack is under the bench.",
      wrongChoices: ["My sisters backpack is under the bench.", "My sisters' backpack is under the bench.", "my sister's backpack is under the bench."],
      explanation: "Sister's shows possession, so it needs an apostrophe."
    }
  ],
  hard: [
    {
      prompt: "Choose the sentence with the best punctuation.",
      correctChoice: "The plan was simple: finish the lab, clean the tables, and submit the report.",
      wrongChoices: ["The plan was simple, finish the lab, clean the tables, and submit the report.", "The plan was simple; finish the lab, clean the tables, and submit the report.", "the plan was simple: finish the lab, clean the tables, and submit the report."],
      explanation: "A colon can introduce a list that explains the plan."
    },
    {
      prompt: "Choose the sentence with the best punctuation.",
      correctChoice: "Lena wanted to leave early; however, the bus had not arrived.",
      wrongChoices: ["Lena wanted to leave early, however the bus had not arrived.", "Lena wanted to leave early however, the bus had not arrived.", "Lena wanted to leave early: however, the bus had not arrived."],
      explanation: "A semicolon can join two closely related complete thoughts."
    },
    {
      prompt: "Choose the sentence with the best punctuation.",
      correctChoice: "\"If we hurry,\" Ava whispered, \"we can catch the next train.\"",
      wrongChoices: ["\"If we hurry\" Ava whispered, \"we can catch the next train.\"", "\"If we hurry,\" Ava whispered \"we can catch the next train.\"", "\"If we hurry\", Ava whispered, \"we can catch the next train.\""],
      explanation: "Interrupted quotations need commas around the dialogue tag."
    },
    {
      prompt: "Choose the sentence with the best punctuation.",
      correctChoice: "The coach's rule was clear: no phones during practice.",
      wrongChoices: ["The coachs rule was clear: no phones during practice.", "The coach's rule was clear; no phones during practice.", "The coach's rule was clear, no phones during practice."],
      explanation: "The apostrophe shows possession, and the colon introduces the rule."
    }
  ]
};

const TRANSITION_BANK = {
  easy: [
    {
      sentence: "Maya finished her science project early. __________, she used the extra time to practice her presentation.",
      correctChoice: "As a result",
      wrongChoices: ["However", "Meanwhile", "For example", "On the other hand"],
      explanation: "As a result shows that the second idea happened because of the first."
    },
    {
      sentence: "The trail looked sunny at first. __________, dark clouds rolled in a few minutes later.",
      correctChoice: "Then",
      wrongChoices: ["For example", "Because", "Instead of", "Likewise"],
      explanation: "Then shows that the second event happened next in time."
    },
    {
      sentence: "Leo wanted to go swimming. __________, the pool was closed for cleaning.",
      correctChoice: "Unfortunately",
      wrongChoices: ["Similarly", "For instance", "Afterward", "In addition"],
      explanation: "Unfortunately fits because the second sentence is disappointing."
    },
    {
      sentence: "The recipe is easy to follow. __________, the ingredients are inexpensive.",
      correctChoice: "In addition",
      wrongChoices: ["Instead", "Suddenly", "As a result", "Otherwise"],
      explanation: "In addition adds another positive detail."
    }
  ],
  medium: [
    {
      sentence: "Jada studied every night for a week. __________, she felt calm on test day.",
      correctChoice: "Therefore",
      wrongChoices: ["Meanwhile", "For example", "In contrast", "At first"],
      explanation: "Therefore shows that her calm feeling was the result of studying."
    },
    {
      sentence: "Theo enjoys basketball. __________, his sister would rather read novels.",
      correctChoice: "In contrast",
      wrongChoices: ["As a result", "For instance", "Similarly", "Later"],
      explanation: "In contrast highlights the difference between Theo and his sister."
    },
    {
      sentence: "The museum had many interesting exhibits. __________, the space section included a real meteorite.",
      correctChoice: "For example",
      wrongChoices: ["Consequently", "Otherwise", "Nevertheless", "Before long"],
      explanation: "For example introduces a specific example of an exhibit."
    },
    {
      sentence: "Ella forgot to charge her laptop. __________, she had to borrow a charger in class.",
      correctChoice: "Consequently",
      wrongChoices: ["Likewise", "Meanwhile", "Specifically", "Although"],
      explanation: "Consequently shows the result of forgetting to charge it."
    }
  ],
  hard: [
    {
      sentence: "The first experiment produced weak results. __________, the team revised the method and ran it again.",
      correctChoice: "Accordingly",
      wrongChoices: ["For instance", "At the same time", "Even so", "By comparison"],
      explanation: "Accordingly shows the second action followed logically from the first result."
    },
    {
      sentence: "The old library was small and crowded. __________, the new building has open study rooms and wide hallways.",
      correctChoice: "By comparison",
      wrongChoices: ["Therefore", "Similarly", "For example", "Eventually"],
      explanation: "By comparison signals a contrast between two related things."
    },
    {
      sentence: "The path looked straightforward on the map. __________, several hidden turns made the hike confusing.",
      correctChoice: "In reality",
      wrongChoices: ["As a result", "For example", "Likewise", "Finally"],
      explanation: "In reality signals that the true situation was different from what was expected."
    },
    {
      sentence: "Nina had already practiced the speech many times. __________, she still reviewed her opening lines one last time.",
      correctChoice: "Even so",
      wrongChoices: ["As a result", "For example", "In addition", "Meanwhile"],
      explanation: "Even so shows that the second action happened despite the first fact."
    }
  ]
};

const REVISION_BANK = {
  easy: [
    {
      original: "The puppy was little and small and tiny.",
      correctChoice: "The puppy was tiny.",
      wrongChoices: ["The puppy was tiny and little and small.", "The puppy was a puppy that was tiny because it was small.", "Tiny puppy little."],
      explanation: "The clearest revision removes repeated ideas and keeps the sentence simple."
    },
    {
      original: "Mia ran quickly because she was late to school and she did not want to miss the bus.",
      correctChoice: "Mia ran quickly because she did not want to miss the bus.",
      wrongChoices: ["Mia ran quickly because she was late to school and because bus.", "Because late, Mia bus ran quickly school.", "Mia quickly quickly ran to not miss maybe the bus."],
      explanation: "The best revision says the idea clearly without awkward repetition."
    },
    {
      original: "The cake tasted good and yummy.",
      correctChoice: "The cake tasted delicious.",
      wrongChoices: ["The cake tasted good and yummy and delicious.", "Delicious was the cake and it tasted cake.", "The cake delicious tasted good yummy."],
      explanation: "The strongest revision combines repeated ideas into one precise word."
    },
    {
      original: "Sam finished his homework, and then after that he played outside.",
      correctChoice: "After finishing his homework, Sam played outside.",
      wrongChoices: ["Sam finished his homework and then after that then he played outside.", "Homework finished Sam outside played after then.", "Sam outside played, and then he did homework."],
      explanation: "The best answer keeps the order clear and removes extra words."
    }
  ],
  medium: [
    {
      original: "The presentation was interesting because it had facts that were surprising to everyone in the room.",
      correctChoice: "The presentation was interesting because its surprising facts caught everyone's attention.",
      wrongChoices: ["The presentation was interesting because facts surprised everyone in the room and that was interesting.", "Interesting facts were in the presentation because the room had everyone.", "The presentation had facts. The facts were facts. Everyone room."],
      explanation: "The clearest revision combines the idea into one smooth sentence."
    },
    {
      original: "Jalen forgot his notes, so he had to give the speech from memory which made him nervous.",
      correctChoice: "Because Jalen forgot his notes, giving the speech from memory made him nervous.",
      wrongChoices: ["Jalen forgot his notes and speech memory nervous notes.", "Jalen gave the speech from memory, notes forgot, nervous.", "Because notes, memory, speech, nervous, Jalen forgot."],
      explanation: "The best revision organizes the cause and effect clearly."
    },
    {
      original: "The cafeteria was noisy, and it was hard to hear my friend talking to me.",
      correctChoice: "The noisy cafeteria made it hard to hear my friend.",
      wrongChoices: ["The cafeteria was noisy and hard and hear and talking.", "My friend was talking to me in the cafeteria and it was cafeteria noisy.", "The cafeteria was noisy and it was hard and difficult to hear."],
      explanation: "The clearest sentence is shorter but keeps the meaning."
    },
    {
      original: "We got to the field early in order to warm up before the game started.",
      correctChoice: "We arrived at the field early to warm up before the game.",
      wrongChoices: ["We got to the field early because the early field got us there.", "Early before the game started, we got to the field and order.", "We field early warm up game started in order to."],
      explanation: "The best revision removes extra wording and keeps the message clear."
    }
  ],
  hard: [
    {
      original: "The article was long, and because it repeated several points, the main argument became harder to follow.",
      correctChoice: "Because the article repeated several points, its main argument became harder to follow.",
      wrongChoices: ["The article was long and repeated, and that was long because argument.", "Repeating several points made the article and main argument because long.", "The article had an argument, and points repeated, and it was article."],
      explanation: "The best revision keeps the cause and effect while removing clutter."
    },
    {
      original: "Our class wanted to win the contest, so we practiced after school every day which helped us improve steadily.",
      correctChoice: "Wanting to win the contest, our class practiced after school every day and improved steadily.",
      wrongChoices: ["Our class wanted to win, practiced, and because every day steadily contest.", "After school every day helped the contest because our class wanted improve.", "The contest improved steadily because our class was every day."],
      explanation: "The clearest revision tightens the sentence while keeping the full idea."
    },
    {
      original: "The hallway was crowded with students, and that made it difficult to move quickly to class on time.",
      correctChoice: "The crowded hallway made it difficult to get to class on time.",
      wrongChoices: ["Students hallway difficult quickly class on time crowded.", "The hallway was crowded and difficult and students and class and quickly.", "Crowded students made the hallway to class on time quickly difficult."],
      explanation: "The best answer is concise and easy to read."
    },
    {
      original: "The instructions looked simple at first, but some missing steps caused several teams to make the same mistake.",
      correctChoice: "Although the instructions looked simple at first, missing steps caused several teams to make the same mistake.",
      wrongChoices: ["The instructions simple at first caused teams because same mistake.", "Several teams made the same mistake and looked simple at first missing steps.", "Instructions looked simple but teams same steps mistake because several."],
      explanation: "The best revision keeps the contrast clear and flows smoothly."
    }
  ]
};

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function uniqueItems(items) {
  return [...new Set(items)];
}

function sample(items, count) {
  return shuffle(items).slice(0, count);
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const bankDeckState = {};

function createQuestion(config) {
  const selectedWrongChoices = sample(uniqueItems(config.wrongChoices).filter((choice) => choice !== config.correctChoice), 3);
  const choices = shuffle([
    { text: config.correctChoice, isAnswer: true },
    ...selectedWrongChoices.map((choice) => ({ text: choice, isAnswer: false }))
  ]);

  return {
    promptLabel: config.promptLabel || "Question",
    prompt: config.prompt,
    questionCopy: config.questionCopy || "",
    dialogue: config.dialogue || [],
    explanation: config.explanation,
    defaultStatus: config.defaultStatus || "Choose the best answer for the question shown.",
    compactPrompt: Boolean(config.compactPrompt),
    choices
  };
}

function getBankDeckEntry(bankKey, bank, level) {
  const deckKey = `${bankKey}:${level}`;
  const entries = bank[level];
  if (!entries || !entries.length) {
    return null;
  }

  let state = bankDeckState[deckKey];
  if (!state || state.order.length !== entries.length) {
    state = {
      order: shuffle(entries.map((_, index) => index)),
      pointer: 0
    };
    bankDeckState[deckKey] = state;
  }

  if (state.pointer >= state.order.length) {
    state.order = shuffle(entries.map((_, index) => index));
    state.pointer = 0;
  }

  const entry = entries[state.order[state.pointer]];
  state.pointer += 1;
  return entry;
}

function pickBankQuestion(bankKey, bank, level, builder) {
  const entry = getBankDeckEntry(bankKey, bank, level);
  if (!entry) {
    throw new Error(`Missing bank entries for ${bankKey}:${level}`);
  }
  return builder(entry);
}

function generateSynonymQuestion(level) {
  return pickBankQuestion("synonyms", SYNONYM_BANK, level, (entry) =>
    createQuestion({
      promptLabel: "Word",
      prompt: entry.word,
      correctChoice: entry.correct,
      wrongChoices: entry.wrongChoices,
      explanation: entry.explanation,
      defaultStatus: "Choose the answer that is closest in meaning."
    })
  );
}

function generateSentenceCompletionQuestion(level) {
  return pickBankQuestion("sentence-completion", SENTENCE_COMPLETION_BANK, level, (entry) =>
    createQuestion({
      promptLabel: "Sentence",
      prompt: entry.sentence,
      correctChoice: randomItem(entry.correctChoices),
      wrongChoices: entry.wrongChoices,
      explanation: entry.explanation,
      defaultStatus: "Choose the word that best completes the sentence.",
      compactPrompt: true
    })
  );
}

function generateGuessTheSentenceQuestion(level) {
  return pickBankQuestion("guess-the-sentence", GUESS_THE_SENTENCE_BANK, level, (entry) =>
    createQuestion({
      promptLabel: "Conversation",
      prompt: entry.prompt,
      dialogue: entry.dialogue,
      correctChoice: entry.correctChoice,
      wrongChoices: entry.wrongChoices,
      explanation: entry.explanation,
      defaultStatus: "Choose the response that best fits the conversation.",
      compactPrompt: true
    })
  );
}

function generatePunctuationQuestion(level) {
  return pickBankQuestion("punctuation", PUNCTUATION_BANK, level, (entry) =>
    createQuestion({
      promptLabel: "Writing",
      prompt: entry.prompt,
      correctChoice: entry.correctChoice,
      wrongChoices: entry.wrongChoices,
      explanation: entry.explanation,
      defaultStatus: "Choose the sentence with the best punctuation.",
      compactPrompt: true
    })
  );
}

function generateTransitionQuestion(level) {
  return pickBankQuestion("transitions", TRANSITION_BANK, level, (entry) =>
    createQuestion({
      promptLabel: "Transition",
      prompt: entry.sentence,
      correctChoice: entry.correctChoice,
      wrongChoices: entry.wrongChoices,
      explanation: entry.explanation,
      defaultStatus: "Choose the transition that best completes the idea.",
      compactPrompt: true
    })
  );
}

function generateRevisionQuestion(level) {
  return pickBankQuestion("revision", REVISION_BANK, level, (entry) =>
    createQuestion({
      promptLabel: "Revision",
      prompt: "Which revision is the clearest?",
      questionCopy: `Original sentence: ${entry.original}`,
      correctChoice: entry.correctChoice,
      wrongChoices: entry.wrongChoices,
      explanation: entry.explanation,
      defaultStatus: "Choose the clearest revision.",
      compactPrompt: true
    })
  );
}

function createNumericChoices(correctAnswer, rawCandidates) {
  const correctText = String(correctAnswer);
  const wrongChoices = uniqueItems(rawCandidates.map((value) => String(value))).filter((value) => value !== correctText);
  while (wrongChoices.length < 3) {
    const filler = String(Number(correctAnswer) + Math.floor(Math.random() * 9) - 4 || Number(correctAnswer) + 5);
    if (filler !== correctText && !wrongChoices.includes(filler)) {
      wrongChoices.push(filler);
    }
  }
  return {
    correctChoice: correctText,
    wrongChoices
  };
}

function generateArithmeticQuestion(level) {
  if (level === "easy") {
    const mode = randomItem(["add", "subtract", "multiply"]);
    let prompt;
    let correctAnswer;
    let wrongChoices;

    if (mode === "add") {
      const a = 10 + Math.floor(Math.random() * 40);
      const b = 5 + Math.floor(Math.random() * 25);
      correctAnswer = a + b;
      wrongChoices = [a + b + 1, a + b - 1, a + b + 10, Math.abs(a - b)];
      prompt = `What is ${a} + ${b}?`;
    } else if (mode === "subtract") {
      const b = 5 + Math.floor(Math.random() * 18);
      const correct = 6 + Math.floor(Math.random() * 35);
      const a = correct + b;
      correctAnswer = correct;
      wrongChoices = [a + b, a - b + 2, b - a, a - 2];
      prompt = `What is ${a} - ${b}?`;
    } else {
      const a = 3 + Math.floor(Math.random() * 10);
      const b = 2 + Math.floor(Math.random() * 9);
      correctAnswer = a * b;
      wrongChoices = [a + b, a * b + a, a * b - b, a + b + 4];
      prompt = `What is ${a} x ${b}?`;
    }

    const choiceSet = createNumericChoices(correctAnswer, wrongChoices);
    return createQuestion({
      promptLabel: "Problem",
      prompt,
      correctChoice: choiceSet.correctChoice,
      wrongChoices: choiceSet.wrongChoices,
      explanation: "Solve the operation carefully and check each number place.",
      defaultStatus: "Solve the arithmetic problem."
    });
  }

  if (level === "medium") {
    const mode = randomItem(["order", "grouping", "mixed"]);
    let prompt;
    let correctAnswer;
    let wrongChoices;

    if (mode === "order") {
      const a = 4 + Math.floor(Math.random() * 8);
      const b = 3 + Math.floor(Math.random() * 7);
      const c = 2 + Math.floor(Math.random() * 6);
      correctAnswer = a + b * c;
      wrongChoices = [(a + b) * c, a * b + c, a + b + c, correctAnswer + 2];
      prompt = `What is ${a} + ${b} x ${c}?`;
    } else if (mode === "grouping") {
      const a = 2 + Math.floor(Math.random() * 6);
      const b = 3 + Math.floor(Math.random() * 7);
      const c = 2 + Math.floor(Math.random() * 5);
      correctAnswer = (a + b) * c;
      wrongChoices = [a + b * c, a * b + c, a + b + c, correctAnswer - c];
      prompt = `What is (${a} + ${b}) x ${c}?`;
    } else {
      const a = 5 + Math.floor(Math.random() * 10);
      const b = 2 + Math.floor(Math.random() * 8);
      const c = 4 + Math.floor(Math.random() * 9);
      correctAnswer = a * b - c;
      wrongChoices = [a * (b - c), a + b - c, a * b + c, correctAnswer + b];
      prompt = `What is ${a} x ${b} - ${c}?`;
    }

    const choiceSet = createNumericChoices(correctAnswer, wrongChoices);
    return createQuestion({
      promptLabel: "Problem",
      prompt,
      correctChoice: choiceSet.correctChoice,
      wrongChoices: choiceSet.wrongChoices,
      explanation: "Use the order of operations and work step by step.",
      defaultStatus: "Solve the arithmetic problem."
    });
  }

  const mode = randomItem(["nested", "division", "combo"]);
  let prompt;
  let correctAnswer;
  let wrongChoices;

  if (mode === "nested") {
    const a = 2 + Math.floor(Math.random() * 5);
    const b = 4 + Math.floor(Math.random() * 7);
    const c = 3 + Math.floor(Math.random() * 6);
    const d = 5 + Math.floor(Math.random() * 8);
    correctAnswer = (a + b) * c - d;
    wrongChoices = [a + b * c - d, (a + b) * (c - d), (a + b) + c - d, correctAnswer + c];
    prompt = `What is (${a} + ${b}) x ${c} - ${d}?`;
  } else if (mode === "division") {
    const divisor = 3 + Math.floor(Math.random() * 5);
    const quotient = 5 + Math.floor(Math.random() * 9);
    const extra = 4 + Math.floor(Math.random() * 8);
    const dividend = divisor * quotient;
    correctAnswer = dividend / divisor + extra;
    wrongChoices = [dividend / (divisor + extra), dividend + divisor + extra, quotient - extra, quotient + divisor];
    prompt = `What is ${dividend} / ${divisor} + ${extra}?`;
  } else {
    const a = 3 + Math.floor(Math.random() * 7);
    const b = 9 + Math.floor(Math.random() * 9);
    const c = 2 + Math.floor(Math.random() * 5);
    const d = 6 + Math.floor(Math.random() * 7);
    correctAnswer = a * (b - c) + d;
    wrongChoices = [a * b - c + d, a * (b - c + d), a + b - c + d, correctAnswer - a];
    prompt = `What is ${a} x (${b} - ${c}) + ${d}?`;
  }

  const choiceSet = createNumericChoices(correctAnswer, wrongChoices);
  return createQuestion({
    promptLabel: "Problem",
    prompt,
    correctChoice: choiceSet.correctChoice,
    wrongChoices: choiceSet.wrongChoices,
    explanation: "Break the problem into smaller steps and follow the order of operations.",
    defaultStatus: "Solve the arithmetic problem."
  });
}

function generateFractionPercentQuestion(level) {
  if (level === "easy") {
    const denominator = randomItem([2, 3, 4, 5]);
    const factor = 2 + Math.floor(Math.random() * 8);
    const total = denominator * factor;
    const numerator = randomItem([1, denominator - 1].filter((value) => value > 0));
    const correctAnswer = (total / denominator) * numerator;
    const prompt = `What is ${numerator}/${denominator} of ${total}?`;
    const choiceSet = createNumericChoices(correctAnswer, [factor, total - correctAnswer, correctAnswer + denominator, total / numerator]);
    return createQuestion({
      promptLabel: "Problem",
      prompt,
      correctChoice: choiceSet.correctChoice,
      wrongChoices: choiceSet.wrongChoices,
      explanation: "Find one part first, then multiply by the numerator if needed.",
      defaultStatus: "Work out the fraction problem."
    });
  }

  if (level === "medium") {
    const mode = randomItem(["percent", "decimal", "fraction"]);
    if (mode === "percent") {
      const percent = randomItem([20, 25, 40, 50, 75]);
      const correctChoice = `${percent}%`;
      const decimal = (percent / 100).toFixed(percent === 25 || percent === 75 ? 2 : 1).replace(/0$/, "");
      return createQuestion({
        promptLabel: "Conversion",
        prompt: `Which percent is equal to ${decimal}?`,
        correctChoice,
        wrongChoices: [`${percent + 10}%`, `${Math.max(5, percent - 15)}%`, `${percent / 10}%`, `${percent + 25}%`],
        explanation: "Move the decimal two places to convert a decimal to a percent.",
        defaultStatus: "Choose the matching conversion."
      });
    }

    if (mode === "decimal") {
      const options = [
        { fraction: "1/4", decimal: "0.25" },
        { fraction: "1/2", decimal: "0.5" },
        { fraction: "3/4", decimal: "0.75" },
        { fraction: "2/5", decimal: "0.4" }
      ];
      const entry = randomItem(options);
      return createQuestion({
        promptLabel: "Conversion",
        prompt: `Which decimal is equal to ${entry.fraction}?`,
        correctChoice: entry.decimal,
        wrongChoices: sample(options.filter((option) => option.decimal !== entry.decimal).map((option) => option.decimal), 3),
        explanation: "Think about dividing the numerator by the denominator.",
        defaultStatus: "Choose the matching conversion."
      });
    }

    const numerator = randomItem([1, 2, 3]);
    const denominator = randomItem([4, 5, 8, 10]);
    const percent = (numerator / denominator) * 100;
    return createQuestion({
      promptLabel: "Conversion",
      prompt: `Which percent is equal to ${numerator}/${denominator}?`,
      correctChoice: `${percent}%`,
      wrongChoices: [`${percent + 10}%`, `${Math.max(5, percent - 20)}%`, `${percent / 2}%`, `${percent + 25}%`],
      explanation: "Turn the fraction into a decimal or scale it to a denominator of 100.",
      defaultStatus: "Choose the matching conversion."
    });
  }

  const mode = randomItem(["discount", "increase", "part"]);
  if (mode === "discount") {
    const original = randomItem([40, 60, 80, 120]);
    const discount = randomItem([10, 20, 25, 30]);
    const correctAnswer = original - (original * discount) / 100;
    const choiceSet = createNumericChoices(correctAnswer, [original * discount / 100, original + (original * discount) / 100, original - discount, correctAnswer + 10]);
    return createQuestion({
      promptLabel: "Problem",
      prompt: `A jacket costs $${original}. It is on sale for ${discount}% off. What is the sale price?`,
      correctChoice: `$${choiceSet.correctChoice}`,
      wrongChoices: choiceSet.wrongChoices.map((choice) => `$${choice}`),
      explanation: "Find the discount amount first, then subtract it from the original price.",
      defaultStatus: "Solve the percent problem.",
      compactPrompt: true
    });
  }

  if (mode === "increase") {
    const base = randomItem([50, 80, 120, 200]);
    const increase = randomItem([10, 15, 25, 30]);
    const correctAnswer = base + (base * increase) / 100;
    const choiceSet = createNumericChoices(correctAnswer, [base * increase / 100, base + increase, base - (base * increase) / 100, correctAnswer + 5]);
    return createQuestion({
      promptLabel: "Problem",
      prompt: `A club had ${base} members. Membership grew by ${increase}%. How many members does it have now?`,
      correctChoice: choiceSet.correctChoice,
      wrongChoices: choiceSet.wrongChoices,
      explanation: "Find the increase and add it to the original amount.",
      defaultStatus: "Solve the percent problem.",
      compactPrompt: true
    });
  }

  const total = randomItem([48, 60, 72, 96]);
  const percent = randomItem([25, 40, 60, 75]);
  const correctAnswer = (total * percent) / 100;
  const choiceSet = createNumericChoices(correctAnswer, [percent, total - correctAnswer, correctAnswer + percent / 5, total / 2]);
  return createQuestion({
    promptLabel: "Problem",
    prompt: `${percent}% of a class of ${total} students joined the art club. How many students joined?`,
    correctChoice: choiceSet.correctChoice,
    wrongChoices: choiceSet.wrongChoices,
    explanation: "Multiply the total by the percent written as a decimal.",
    defaultStatus: "Solve the percent problem.",
    compactPrompt: true
  });
}

function generateEquationQuestion(level) {
  if (level === "easy") {
    const mode = randomItem(["addition", "multiplication"]);
    if (mode === "addition") {
      const answer = 3 + Math.floor(Math.random() * 12);
      const addend = 2 + Math.floor(Math.random() * 9);
      const total = answer + addend;
      const choiceSet = createNumericChoices(answer, [total - 1, addend, answer + addend, answer + 2]);
      return createQuestion({
        promptLabel: "Equation",
        prompt: `Solve for x: x + ${addend} = ${total}`,
        correctChoice: choiceSet.correctChoice,
        wrongChoices: choiceSet.wrongChoices,
        explanation: "Subtract the addend from both sides to find x.",
        defaultStatus: "Solve the equation."
      });
    }

    const factor = 2 + Math.floor(Math.random() * 7);
    const answer = 3 + Math.floor(Math.random() * 9);
    const total = factor * answer;
    const choiceSet = createNumericChoices(answer, [factor + answer, total - factor, total / 2, answer + factor]);
    return createQuestion({
      promptLabel: "Equation",
      prompt: `Solve for x: ${factor}x = ${total}`,
      correctChoice: choiceSet.correctChoice,
      wrongChoices: choiceSet.wrongChoices,
      explanation: "Divide both sides by the number next to x.",
      defaultStatus: "Solve the equation."
    });
  }

  if (level === "medium") {
    const mode = randomItem(["twoStep", "division"]);
    if (mode === "twoStep") {
      const factor = 2 + Math.floor(Math.random() * 5);
      const answer = 2 + Math.floor(Math.random() * 10);
      const constant = 3 + Math.floor(Math.random() * 9);
      const total = factor * answer + constant;
      const choiceSet = createNumericChoices(answer, [total - constant, total / factor, answer + constant, answer - 1]);
      return createQuestion({
        promptLabel: "Equation",
        prompt: `Solve for x: ${factor}x + ${constant} = ${total}`,
        correctChoice: choiceSet.correctChoice,
        wrongChoices: choiceSet.wrongChoices,
        explanation: "Subtract first, then divide.",
        defaultStatus: "Solve the equation."
      });
    }

    const divisor = 2 + Math.floor(Math.random() * 5);
    const quotient = 4 + Math.floor(Math.random() * 9);
    const constant = 2 + Math.floor(Math.random() * 6);
    const total = quotient + constant;
    const answer = quotient * divisor;
    const choiceSet = createNumericChoices(answer, [quotient + constant, total + divisor, answer - divisor, quotient]);
    return createQuestion({
      promptLabel: "Equation",
      prompt: `Solve for x: x / ${divisor} + ${constant} = ${total}`,
      correctChoice: choiceSet.correctChoice,
      wrongChoices: choiceSet.wrongChoices,
      explanation: "Subtract the constant, then multiply by the divisor.",
      defaultStatus: "Solve the equation."
    });
  }

  const mode = randomItem(["ticket", "perimeter", "groupCost"]);
  if (mode === "ticket") {
    const ticketPrice = randomItem([6, 7, 8, 9]);
    const fee = randomItem([10, 12, 15]);
    const count = randomItem([2, 3, 4]);
    const total = ticketPrice * count + fee;
    const choiceSet = createNumericChoices(ticketPrice, [total - fee, total / count, fee, ticketPrice + count]);
    return createQuestion({
      promptLabel: "Word Problem",
      prompt: `${count} tickets plus a $${fee} service fee cost $${total} total. How much does one ticket cost?`,
      correctChoice: `$${choiceSet.correctChoice}`,
      wrongChoices: choiceSet.wrongChoices.map((choice) => `$${choice}`),
      explanation: "Subtract the fee, then divide the remaining amount by the number of tickets.",
      defaultStatus: "Solve the word problem.",
      compactPrompt: true
    });
  }

  if (mode === "perimeter") {
    const length = randomItem([9, 11, 13, 15]);
    const width = randomItem([4, 5, 6, 7]);
    const perimeter = 2 * (length + width);
    const choiceSet = createNumericChoices(width, [perimeter / 2, length - width, perimeter - length, width + 3]);
    return createQuestion({
      promptLabel: "Word Problem",
      prompt: `A rectangle has a perimeter of ${perimeter}. Its length is ${length}. What is its width?`,
      correctChoice: choiceSet.correctChoice,
      wrongChoices: choiceSet.wrongChoices,
      explanation: "Half the perimeter gives length plus width. Then subtract the length.",
      defaultStatus: "Solve the word problem.",
      compactPrompt: true
    });
  }

  const notebookPrice = randomItem([3, 4, 5, 6]);
  const notebookCount = randomItem([3, 4, 5]);
  const penPrice = randomItem([2, 3, 4]);
  const total = notebookPrice * notebookCount + penPrice;
  const choiceSet = createNumericChoices(notebookPrice, [total - penPrice, total / notebookCount, penPrice, notebookPrice + notebookCount]);
  return createQuestion({
    promptLabel: "Word Problem",
    prompt: `${notebookCount} notebooks and one pen cost $${total}. The pen costs $${penPrice}. How much does each notebook cost?`,
    correctChoice: `$${choiceSet.correctChoice}`,
    wrongChoices: choiceSet.wrongChoices.map((choice) => `$${choice}`),
    explanation: "Subtract the pen cost, then divide by the number of notebooks.",
    defaultStatus: "Solve the word problem.",
    compactPrompt: true
  });
}

const STUDY_CONTENT = {
  reading: {
    title: "Reading Practice",
    description: "Build vocabulary, sentence logic, and conversation understanding with fresh generated prompts.",
    practices: {
      synonyms: {
        title: "Synonyms",
        blurb: "Choose the answer that means almost the same thing as the word given.",
        directions: "Directions: Each question is followed by four (4) answer choices. Select the answer that is most similar in meaning to the word given.",
        defaultStatus: "Choose the answer that is closest in meaning.",
        levels: {
          easy: { description: "Clear everyday vocabulary", generator: () => generateSynonymQuestion("easy") },
          medium: { description: "School-style reading words", generator: () => generateSynonymQuestion("medium") },
          hard: { description: "Challenging academic vocabulary", generator: () => generateSynonymQuestion("hard") }
        }
      },
      sentence: {
        title: "Sentence Completion",
        blurb: "Pick the word or phrase that best completes the sentence.",
        directions: "Directions: Read the sentence and choose the answer that best completes the blank.",
        defaultStatus: "Choose the word that best completes the sentence.",
        levels: {
          easy: { description: "Simple context clues", generator: () => generateSentenceCompletionQuestion("easy") },
          medium: { description: "Stronger school vocabulary", generator: () => generateSentenceCompletionQuestion("medium") },
          hard: { description: "Academic and precise wording", generator: () => generateSentenceCompletionQuestion("hard") }
        }
      },
      guess: {
        title: "Guess the Sentence",
        blurb: "Read a short dialogue and choose the response that fits best.",
        directions: "Directions: Read the conversation and select the most likely response the speaker should say next.",
        defaultStatus: "Choose the response that best fits the conversation.",
        levels: {
          easy: { description: "Direct and obvious responses", generator: () => generateGuessTheSentenceQuestion("easy") },
          medium: { description: "Tactful school-style responses", generator: () => generateGuessTheSentenceQuestion("medium") },
          hard: { description: "More thoughtful and nuanced replies", generator: () => generateGuessTheSentenceQuestion("hard") }
        }
      }
    }
  },
  writing: {
    title: "Writing Practice",
    description: "Practice punctuation, stronger transitions, and cleaner revisions across three difficulty levels.",
    practices: {
      punctuation: {
        title: "Punctuation Fix",
        blurb: "Choose the sentence with the best punctuation and capitalization.",
        directions: "Directions: Read each choice and select the sentence that is punctuated correctly.",
        defaultStatus: "Choose the sentence with the best punctuation.",
        levels: {
          easy: { description: "Capital letters, commas, end marks", generator: () => generatePunctuationQuestion("easy") },
          medium: { description: "Quotes, dates, apostrophes", generator: () => generatePunctuationQuestion("medium") },
          hard: { description: "Semicolons, colons, advanced commas", generator: () => generatePunctuationQuestion("hard") }
        }
      },
      transitions: {
        title: "Transition Words",
        blurb: "Pick the transition that best connects the ideas.",
        directions: "Directions: Choose the transition word or phrase that best completes the sentence.",
        defaultStatus: "Choose the transition that fits the idea best.",
        levels: {
          easy: { description: "Basic time and result links", generator: () => generateTransitionQuestion("easy") },
          medium: { description: "Cause, contrast, and examples", generator: () => generateTransitionQuestion("medium") },
          hard: { description: "Precise and nuanced transitions", generator: () => generateTransitionQuestion("hard") }
        }
      },
      revision: {
        title: "Best Revision",
        blurb: "Choose the clearest revision of the original sentence.",
        directions: "Directions: Read the original sentence and select the revision that is clearest and strongest.",
        defaultStatus: "Choose the clearest revision.",
        levels: {
          easy: { description: "Remove repetition and extra words", generator: () => generateRevisionQuestion("easy") },
          medium: { description: "Improve clarity and flow", generator: () => generateRevisionQuestion("medium") },
          hard: { description: "Tighten complex sentences", generator: () => generateRevisionQuestion("hard") }
        }
      }
    }
  },
  math: {
    title: "Math Practice",
    description: "Generate new arithmetic, fraction, percent, and equation problems each time you practice.",
    practices: {
      arithmetic: {
        title: "Arithmetic Challenge",
        blurb: "Solve number operations from quick basics to multi-step work.",
        directions: "Directions: Solve each arithmetic problem and choose the correct answer.",
        defaultStatus: "Solve the arithmetic problem.",
        levels: {
          easy: { description: "Basic addition, subtraction, multiplication", generator: () => generateArithmeticQuestion("easy") },
          medium: { description: "Order of operations and grouping", generator: () => generateArithmeticQuestion("medium") },
          hard: { description: "Multi-step expressions", generator: () => generateArithmeticQuestion("hard") }
        }
      },
      fractions: {
        title: "Fractions and Percents",
        blurb: "Practice part-whole thinking, conversions, and percent word problems.",
        directions: "Directions: Solve the fraction, decimal, or percent problem and choose the best answer.",
        defaultStatus: "Work through the fraction or percent problem.",
        levels: {
          easy: { description: "Simple fraction of a whole", generator: () => generateFractionPercentQuestion("easy") },
          medium: { description: "Fraction, decimal, and percent conversions", generator: () => generateFractionPercentQuestion("medium") },
          hard: { description: "Discounts, increases, and percent applications", generator: () => generateFractionPercentQuestion("hard") }
        }
      },
      equations: {
        title: "Equation Solver",
        blurb: "Solve for x and handle short algebra word problems.",
        directions: "Directions: Solve each equation or word problem and select the correct answer.",
        defaultStatus: "Solve the equation or word problem.",
        levels: {
          easy: { description: "One-step equations", generator: () => generateEquationQuestion("easy") },
          medium: { description: "Two-step equations", generator: () => generateEquationQuestion("medium") },
          hard: { description: "Word problems and deeper algebra", generator: () => generateEquationQuestion("hard") }
        }
      }
    }
  }
};

let selectedCourse = "reading";
let selectedPractice = "synonyms";
let selectedLevel = "easy";
let currentQuestion = null;
let questionLocked = false;
const scoreByPractice = {};
const questionCounters = {};

function getCourseConfig() {
  return STUDY_CONTENT[selectedCourse];
}

function getPracticeConfig() {
  return getCourseConfig().practices[selectedPractice];
}

function getPracticeKey() {
  return `${selectedCourse}:${selectedPractice}`;
}

function ensurePracticeState(practiceKey) {
  if (!scoreByPractice[practiceKey]) {
    scoreByPractice[practiceKey] = { correct: 0, wrong: 0 };
  }
  if (!questionCounters[practiceKey]) {
    questionCounters[practiceKey] = { easy: 0, medium: 0, hard: 0 };
  }
}

function setSignal(state) {
  signalEl.classList.remove("signal-idle", "signal-success", "signal-error");
  signalEl.classList.add(`signal-${state}`);
}

function setStatus(message) {
  statusEl.textContent = message;
}

function updateCourseButtons() {
  Object.entries(COURSE_BUTTONS).forEach(([course, button]) => {
    button.classList.toggle("is-selected", course === selectedCourse);
  });
}

function updateStats() {
  const practiceKey = getPracticeKey();
  ensurePracticeState(practiceKey);
  currentCourseEl.textContent = titleCase(selectedCourse);
  currentPracticeEl.textContent = getPracticeConfig().title;
  currentLevelEl.textContent = LEVEL_LABELS[selectedLevel];
  questionNumberEl.textContent = String(questionCounters[practiceKey][selectedLevel] + 1);
  correctCountEl.textContent = String(scoreByPractice[practiceKey].correct);
  wrongCountEl.textContent = String(scoreByPractice[practiceKey].wrong);
}

function renderPracticeButtons() {
  const course = getCourseConfig();
  practiceGridEl.innerHTML = "";

  Object.entries(course.practices).forEach(([practiceKey, practice]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `study-practice-card${practiceKey === selectedPractice ? " is-selected" : ""}`;
    button.innerHTML = `<strong>${practice.title}</strong><span>${practice.blurb}</span>`;
    button.addEventListener("click", () => showPractice(practiceKey));
    practiceGridEl.appendChild(button);
  });
}

function renderLevelButtons() {
  const practice = getPracticeConfig();
  levelGridEl.innerHTML = "";

  LEVEL_ORDER.forEach((level) => {
    const levelConfig = practice.levels[level];
    const button = document.createElement("button");
    button.type = "button";
    button.className = `level-pill${level === selectedLevel ? " is-selected" : ""}`;
    button.innerHTML = `${LEVEL_LABELS[level]}<span>${levelConfig.description}</span>`;
    button.addEventListener("click", () => showLevel(level));
    levelGridEl.appendChild(button);
  });
}

function renderDialogue(dialogue) {
  dialogueBlockEl.innerHTML = "";
  if (!dialogue.length) {
    dialogueBlockEl.classList.add("hidden");
    return;
  }

  dialogue.forEach((line) => {
    const row = document.createElement("p");
    row.className = "study-dialogue-line";

    const speaker = document.createElement("strong");
    speaker.textContent = `${line.speaker}:`;

    const text = document.createElement("span");
    text.textContent = ` ${line.text}`;

    row.appendChild(speaker);
    row.appendChild(text);
    dialogueBlockEl.appendChild(row);
  });

  dialogueBlockEl.classList.remove("hidden");
}

function renderCurrentQuestion() {
  const practiceKey = getPracticeKey();
  const practice = getPracticeConfig();
  ensurePracticeState(practiceKey);
  currentQuestion = practice.levels[selectedLevel].generator();
  questionLocked = false;

  subjectTitleEl.textContent = getCourseConfig().title;
  subjectCopyEl.textContent = getCourseConfig().description;
  practiceTitleEl.textContent = practice.title;
  directionsEl.textContent = practice.directions;
  promptLabelEl.textContent = currentQuestion.promptLabel;
  wordPromptEl.textContent = currentQuestion.prompt;
  wordPromptEl.classList.toggle("study-word-prompt-compact", currentQuestion.compactPrompt || currentQuestion.prompt.length > 70);
  questionCopyEl.textContent = currentQuestion.questionCopy;
  questionCopyEl.classList.toggle("hidden", !currentQuestion.questionCopy);
  renderDialogue(currentQuestion.dialogue);

  answerGridEl.innerHTML = "";
  currentQuestion.choices.forEach((entry, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-button secondary";
    button.innerHTML = `<strong>${String.fromCharCode(65 + index)}</strong><span>${entry.text}</span>`;
    button.addEventListener("click", () => chooseAnswer(index));
    answerGridEl.appendChild(button);
  });

  setSignal("idle");
  setStatus(practice.defaultStatus);
  updateStats();
}

function showCourse(course) {
  selectedCourse = course;
  selectedPractice = Object.keys(getCourseConfig().practices)[0];
  selectedLevel = "easy";
  updateCourseButtons();
  renderPracticeButtons();
  renderLevelButtons();
  renderCurrentQuestion();
}

function showPractice(practice) {
  selectedPractice = practice;
  selectedLevel = "easy";
  renderPracticeButtons();
  renderLevelButtons();
  renderCurrentQuestion();
}

function showLevel(level) {
  selectedLevel = level;
  renderLevelButtons();
  renderCurrentQuestion();
}

function chooseAnswer(index) {
  if (questionLocked || !currentQuestion) {
    return;
  }

  questionLocked = true;
  const practiceKey = getPracticeKey();
  const buttons = Array.from(answerGridEl.querySelectorAll(".answer-button"));
  const selectedEntry = currentQuestion.choices[index];
  const correctEntry = currentQuestion.choices.find((entry) => entry.isAnswer);

  buttons.forEach((button, buttonIndex) => {
    const entry = currentQuestion.choices[buttonIndex];
    button.disabled = true;
    if (entry.isAnswer) {
      button.classList.add("is-correct-answer");
    }
  });

  if (selectedEntry.isAnswer) {
    scoreByPractice[practiceKey].correct += 1;
    buttons[index].classList.add("is-correct-answer");
    setSignal("success");
    setStatus(`Correct. ${currentQuestion.explanation}`);
  } else {
    scoreByPractice[practiceKey].wrong += 1;
    buttons[index].classList.add("is-wrong-answer");
    setSignal("error");
    setStatus(`Not quite. The best answer was "${correctEntry.text}". ${currentQuestion.explanation}`);
  }

  updateStats();
}

function nextQuestion() {
  const practiceKey = getPracticeKey();
  ensurePracticeState(practiceKey);
  questionCounters[practiceKey][selectedLevel] += 1;
  renderCurrentQuestion();
}

function resetScore() {
  const practiceKey = getPracticeKey();
  scoreByPractice[practiceKey] = { correct: 0, wrong: 0 };
  questionCounters[practiceKey] = { easy: 0, medium: 0, hard: 0 };
  renderCurrentQuestion();
  setSignal("idle");
  setStatus(`${getPracticeConfig().title} score reset. Keep practicing.`);
}

Object.entries(COURSE_BUTTONS).forEach(([course, button]) => {
  button.addEventListener("click", () => showCourse(course));
});

nextQuestionEl.addEventListener("click", nextQuestion);
resetScoreEl.addEventListener("click", resetScore);

showCourse("reading");
