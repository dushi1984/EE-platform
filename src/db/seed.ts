import { db } from "@/db";
import { count } from "drizzle-orm";
import { grades, lessonProgress, lessons, materialViews, materials, purchases, quizQuestions, subjects, taskProgress, tasks, users } from "@/db/schema";
import { hashPassword } from "@/lib/session";
import { seedTeacherData } from "@/db/seed-teacher";

export const DEMO_STUDENT_CODE = "12345";
export const DEMO_QR_TOKEN = "FATMA-DEMO-2026";
export const DEMO_PASSWORD = "password123";

type SeedQuiz = { q: string; options: string[]; correct: number; explanation?: string };
type SeedLesson = { title: string; titleAr: string; duration: number; content: string; quiz?: SeedQuiz[] };
type SeedMaterial = {
  slug: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  subject: string;
  thumbnail: string;
  priceCents: number;
  isNew: boolean;
  lessons: SeedLesson[];
};

const BIO_IMG = "https://images.pexels.com/photos/8976794/pexels-photo-8976794.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";
const MATH_IMG = "https://images.pexels.com/photos/6238050/pexels-photo-6238050.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";
const AVATAR_IMG = "https://images.pexels.com/photos/8199174/pexels-photo-8199174.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

const seedSubjects = [
  { name: "Chemistry", nameAr: "الكيمياء", color: "emerald", icon: "🧪" },
  { name: "Physics", nameAr: "الفيزياء", color: "sky", icon: "⚛️" },
  { name: "Biology", nameAr: "الأحياء", color: "rose", icon: "🧬" },
  { name: "Mathematics", nameAr: "الرياضيات", color: "amber", icon: "📐" },
];

const seedMaterials: SeedMaterial[] = [
  {
    slug: "chemistry-fundamentals",
    title: "Chemistry Fundamentals",
    titleAr: "أساسيات الكيمياء",
    description:
      "Everything you need to build a rock-solid base in chemistry: atomic structure, the periodic table, bonding and the mole concept. Each lesson ends with a short quiz so you can check your understanding immediately.",
    descriptionAr: "كل ما تحتاجه لبناء أساس قوي في الكيمياء: التركيب الذري، الجدول الدوري، الروابط ومفهوم المول. ينتهي كل درس باختبار قصير لتتأكد من فهمك فوراً.",
    subject: "Chemistry",
    thumbnail: "/images/materials/chemistry.jpg",
    priceCents: 14999,
    isNew: true,
    lessons: [
      {
        title: "Atomic Structure",
        titleAr: "التركيب الذري",
        duration: 15,
        content:
          "## What is an atom made of?\n\nEvery atom has a tiny, dense **nucleus** containing protons and neutrons, surrounded by electrons arranged in shells.\n\n| Particle | Charge | Relative mass | Location |\n|---|---|---|---|\n| Proton | +1 | 1 | Nucleus |\n| Neutron | 0 | 1 | Nucleus |\n| Electron | −1 | ~1/1840 | Shells |\n\n### Key numbers\n- **Atomic number (Z)** = number of protons. It defines the element.\n- **Mass number (A)** = protons + neutrons.\n- **Isotopes** are atoms of the same element with different numbers of neutrons.\n\n> Example: Carbon-12 and Carbon-14 both have 6 protons, but 6 and 8 neutrons respectively.\n\n### Electron shells\nElectrons fill shells from the inside out: 2, 8, 8 for the first twenty elements. The outer shell electrons (valence electrons) decide how an element reacts.",
        quiz: [
          { q: "Which particle carries a negative charge?", options: ["Proton", "Neutron", "Electron", "Nucleus"], correct: 2, explanation: "Electrons are negatively charged and orbit the nucleus in shells." },
          { q: "Isotopes of an element differ in the number of…", options: ["Protons", "Electrons", "Neutrons", "Shells"], correct: 2 },
        ],
      },
      {
        title: "The Periodic Table & Trends",
        titleAr: "الجدول الدوري واتجاهاته",
        duration: 20,
        content:
          "## Reading the table\n\nElements are arranged by increasing atomic number. **Columns are groups** (same number of valence electrons, similar chemistry). **Rows are periods** (same number of shells).\n\n### Trends you must know\n- **Atomic radius** decreases across a period and increases down a group.\n- **Electronegativity** increases across a period and decreases down a group.\n- **Metallic character** increases down a group and decreases across a period.\n\n### Why does radius shrink across a period?\nMore protons pull the same shells closer — the nuclear charge increases while shielding stays the same.\n\n> Group 1 (alkali metals) get *more* reactive down the group; Group 17 (halogens) get *less* reactive.",
        quiz: [{ q: "Across a period from left to right, atomic radius generally…", options: ["Increases", "Decreases", "Stays the same", "Doubles"], correct: 1, explanation: "Nuclear charge increases with no extra shielding, pulling electrons closer." }],
      },
      {
        title: "Chemical Bonding",
        titleAr: "الروابط الكيميائية",
        duration: 22,
        content:
          "## Why do atoms bond?\n\nAtoms bond to reach a stable, full outer shell. There are three main types:\n\n| Bond | Between | Electrons | Example |\n|---|---|---|---|\n| Ionic | Metal + non-metal | Transferred | NaCl |\n| Covalent | Non-metals | Shared | H₂O |\n| Metallic | Metals | Delocalised sea | Cu |\n\n### Properties follow from structure\n- Ionic compounds: high melting points, conduct when molten or dissolved.\n- Simple covalent molecules: low melting points, don't conduct.\n- Metals: malleable, conduct heat and electricity.\n\n### Polar or not?\nIf two bonded atoms differ in electronegativity, the bond is **polar** — electrons sit closer to the more electronegative atom.",
        quiz: [{ q: "Sodium chloride (NaCl) is held together by…", options: ["Covalent bonds", "Ionic bonds", "Metallic bonds", "Hydrogen bonds"], correct: 1 }],
      },
      {
        title: "Stoichiometry & the Mole",
        titleAr: "الحسابات الكيميائية والمول",
        duration: 25,
        content:
          "## Counting atoms by weighing\n\nOne **mole** contains 6.02 × 10²³ particles (Avogadro's number). The **molar mass** of a substance (g/mol) is numerically equal to its relative formula mass.\n\n### The three-step method\n1. Convert mass to moles: n = m / M\n2. Use the balanced equation's ratio\n3. Convert moles back to mass\n\n### Worked example\nHow much water forms when 4 g of hydrogen burns?\n\n- 2H₂ + O₂ → 2H₂O\n- n(H₂) = 4 / 2 = 2 mol → n(H₂O) = 2 mol\n- m(H₂O) = 2 × 18 = **36 g**\n\n> Always balance the equation first. Unbalanced ratios give wrong answers every time.",
        quiz: [{ q: "How many particles are in one mole of a substance?", options: ["6.02 × 10²³", "3.14 × 10⁸", "1.6 × 10⁻¹⁹", "9.8"], correct: 0 }],
      },
    ],
  },
  {
    slug: "organic-chemistry-essentials",
    title: "Organic Chemistry Essentials",
    titleAr: "أساسيات الكيمياء العضوية",
    description: "Hydrocarbons, functional groups and the reaction types that appear in every exam. Learn to name compounds confidently and predict products.",
    descriptionAr: "الهيدروكربونات والمجموعات الوظيفية وأنواع التفاعلات التي تظهر في كل امتحان. تعلّم تسمية المركبات بثقة وتوقع النواتج.",
    subject: "Chemistry",
    thumbnail: "/images/materials/chemistry.jpg",
    priceCents: 19999,
    isNew: false,
    lessons: [
      {
        title: "Hydrocarbons",
        titleAr: "الهيدروكربونات",
        duration: 18,
        content:
          "## Alkanes, alkenes, alkynes\n\n- **Alkanes** (CₙH₂ₙ₊₂): single bonds only, saturated, fairly unreactive.\n- **Alkenes** (CₙH₂ₙ): at least one C=C double bond, undergo addition reactions.\n- **Alkynes** (CₙH₂ₙ₋₂): a C≡C triple bond.\n\n### Naming\nCount the longest carbon chain: meth-, eth-, prop-, but-, pent-, hex-. Then add the ending: -ane, -ene, -yne.\n\n> Test for unsaturation: bromine water turns from orange to colourless with alkenes.",
      },
      {
        title: "Functional Groups",
        titleAr: "المجموعات الوظيفية",
        duration: 20,
        content:
          "## The parts that react\n\n| Group | Formula | Family | Example |\n|---|---|---|---|\n| Hydroxyl | –OH | Alcohols | Ethanol |\n| Carboxyl | –COOH | Carboxylic acids | Ethanoic acid |\n| Carbonyl | C=O | Aldehydes/Ketones | Propanone |\n| Amino | –NH₂ | Amines | Methylamine |\n| Ester | –COO– | Esters | Ethyl ethanoate |\n\nRecognising the functional group tells you the compound's properties and typical reactions.",
        quiz: [{ q: "The –OH functional group characterises which family?", options: ["Alkanes", "Alcohols", "Ketones", "Esters"], correct: 1 }],
      },
      {
        title: "Reaction Types",
        titleAr: "أنواع التفاعلات",
        duration: 22,
        content:
          "## Four reactions to master\n\n1. **Substitution** — an atom is swapped (alkanes + halogens in UV light).\n2. **Addition** — a molecule adds across a double bond (alkenes + Br₂).\n3. **Esterification** — alcohol + carboxylic acid ⇌ ester + water (acid catalyst).\n4. **Oxidation** — alcohols → aldehydes → carboxylic acids.\n\n### Exam tip\nAlways state the **conditions**: catalyst, temperature, UV light. Marks are often awarded for conditions alone.",
      },
    ],
  },
  {
    slug: "physics-mechanics",
    title: "Physics: Mechanics",
    titleAr: "الفيزياء: الميكانيكا",
    description: "Motion, forces and energy — the backbone of physics. Free for all students. Includes worked problems and quick quizzes.",
    descriptionAr: "الحركة والقوى والطاقة — العمود الفقري للفيزياء. مجاني لكل الطلاب، ويتضمن مسائل محلولة واختبارات سريعة.",
    subject: "Physics",
    thumbnail: "/images/materials/physics.jpg",
    priceCents: 0,
    isNew: false,
    lessons: [
      {
        title: "Kinematics",
        titleAr: "علم الحركة",
        duration: 20,
        content:
          "## Describing motion\n\n- **Displacement** is distance in a given direction.\n- **Velocity** = displacement / time.\n- **Acceleration** = change in velocity / time.\n\n### The SUVAT equations (constant acceleration)\n- v = u + at\n- s = ut + ½at²\n- v² = u² + 2as\n\n### Graphs\n- Gradient of a displacement–time graph = velocity.\n- Gradient of a velocity–time graph = acceleration; **area under it = displacement**.",
        quiz: [{ q: "A car accelerates from rest at 2 m/s² for 5 s. What is its final speed?", options: ["5 m/s", "10 m/s", "20 m/s", "2.5 m/s"], correct: 1, explanation: "v = u + at = 0 + 2 × 5 = 10 m/s." }],
      },
      {
        title: "Newton's Laws",
        titleAr: "قوانين نيوتن",
        duration: 22,
        content:
          "## Three laws, countless problems\n\n1. **First law** — an object keeps its velocity unless a resultant force acts.\n2. **Second law** — F = ma. Resultant force produces acceleration in its direction.\n3. **Third law** — forces come in equal and opposite pairs acting on *different* bodies.\n\n### Free-body diagrams\nDraw every force on the object: weight, normal reaction, friction, tension. Resolve along and perpendicular to the motion.\n\n> Weight and normal reaction are **not** a third-law pair — they act on the same object.",
        quiz: [{ q: "F = ma is a statement of Newton's…", options: ["First law", "Second law", "Third law", "Law of gravitation"], correct: 1 }],
      },
      {
        title: "Work, Energy & Power",
        titleAr: "الشغل والطاقة والقدرة",
        duration: 18,
        content:
          "## Energy is conserved\n\n- **Work done** W = F × d (force along the displacement).\n- **Kinetic energy** = ½mv²\n- **Gravitational PE** = mgh\n- **Power** = work / time = energy transferred per second.\n\n### Problem strategy\nWhen friction is negligible, set *initial energy = final energy* and solve. When it isn't, the difference is the work done against friction.",
      },
    ],
  },
  {
    slug: "electricity-and-magnetism",
    title: "Physics: Electricity & Magnetism",
    titleAr: "الفيزياء: الكهرباء والمغناطيسية",
    description: "Charge, fields, circuits and electromagnetic induction explained with clear diagrams and plenty of practice.",
    descriptionAr: "الشحنة والمجالات والدوائر الكهربية والحث الكهرومغناطيسي بشرح واضح وتدريبات وفيرة.",
    subject: "Physics",
    thumbnail: "/images/materials/physics.jpg",
    priceCents: 17999,
    isNew: true,
    lessons: [
      {
        title: "Electric Charge & Fields",
        titleAr: "الشحنة والمجال الكهربي",
        duration: 20,
        content:
          "## Like charges repel\n\nCharge is measured in coulombs (C). **Coulomb's law**: F = kq₁q₂ / r². An electric field is the force per unit positive charge, E = F / q.\n\n### Field lines\n- Start on positive, end on negative.\n- Closer lines = stronger field.\n- Between parallel plates the field is uniform: E = V / d.",
      },
      {
        title: "Current & Circuits",
        titleAr: "التيار والدوائر الكهربية",
        duration: 25,
        content:
          "## Ohm's law and beyond\n\n- **Current** I = Q / t\n- **Ohm's law** V = IR\n- **Power** P = VI = I²R\n\n### Series vs parallel\n| | Series | Parallel |\n|---|---|---|\n| Current | Same everywhere | Splits |\n| Voltage | Splits | Same across branches |\n| Resistance | R₁ + R₂ | 1/R = 1/R₁ + 1/R₂ |\n\n> Kirchhoff: current into a junction equals current out; voltages around any loop sum to zero.",
        quiz: [{ q: "According to Ohm's law, V = …", options: ["I / R", "I × R", "R / I", "I² × R"], correct: 1 }],
      },
      {
        title: "Magnetism & Induction",
        titleAr: "المغناطيسية والحث",
        duration: 22,
        content:
          "## Moving charges make fields\n\nA current-carrying wire in a magnetic field feels a force F = BIL (Fleming's left-hand rule).\n\n### Electromagnetic induction\nChanging magnetic flux through a coil induces an EMF (Faraday). The induced current opposes the change that made it (Lenz).\n\n### Transformers\nVₛ / Vₚ = Nₛ / Nₚ — step-up transformers increase voltage and reduce current, which cuts power losses in transmission lines.",
      },
    ],
  },
  {
    slug: "biology-cells-and-genetics",
    title: "Biology: Cells & Genetics",
    titleAr: "الأحياء: الخلايا والوراثة",
    description: "From organelles to inheritance: cell structure, mitosis & meiosis and Mendel's laws with annotated diagrams.",
    descriptionAr: "من العضيات إلى الوراثة: تركيب الخلية، الانقسام الميتوزي والميوزي وقوانين مندل مع رسوم توضيحية.",
    subject: "Biology",
    thumbnail: BIO_IMG,
    priceCents: 12999,
    isNew: false,
    lessons: [
      {
        title: "Cell Structure",
        titleAr: "تركيب الخلية",
        duration: 18,
        content:
          "## The building blocks of life\n\n| Organelle | Job |\n|---|---|\n| Nucleus | Stores DNA, controls the cell |\n| Mitochondrion | Aerobic respiration — releases energy |\n| Ribosome | Protein synthesis |\n| Chloroplast | Photosynthesis (plants only) |\n| Cell membrane | Controls what enters and leaves |\n\n### Plant vs animal cells\nPlant cells additionally have a **cell wall**, **chloroplasts** and a large permanent **vacuole**.",
        quiz: [{ q: "Which organelle is known as the powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondrion", "Golgi apparatus"], correct: 2 }],
      },
      {
        title: "Cell Division",
        titleAr: "انقسام الخلية",
        duration: 20,
        content:
          "## Mitosis vs meiosis\n\n- **Mitosis** → 2 identical diploid cells. Used for growth and repair.\n- **Meiosis** → 4 genetically different haploid gametes. Introduces variation through crossing over and independent assortment.\n\n### Stages of mitosis\nProphase → Metaphase → Anaphase → Telophase (remember *PMAT*).\n\n> Errors in cell-cycle control can lead to uncontrolled division — the basis of tumours.",
      },
      {
        title: "Mendelian Genetics",
        titleAr: "وراثة مندل",
        duration: 24,
        content:
          "## Predicting inheritance\n\n- **Allele**: a version of a gene. **Dominant** alleles mask **recessive** ones.\n- **Genotype** (Aa) vs **phenotype** (what you see).\n\n### Punnett squares\nCross Aa × Aa:\n\n| | A | a |\n|---|---|---|\n| **A** | AA | Aa |\n| **a** | Aa | aa |\n\nPhenotype ratio **3 : 1** dominant to recessive; genotype ratio 1 : 2 : 1.",
        quiz: [{ q: "A heterozygous cross Aa × Aa gives what phenotype ratio (dominant : recessive)?", options: ["1 : 1", "3 : 1", "1 : 2 : 1", "4 : 0"], correct: 1 }],
      },
    ],
  },
  {
    slug: "calculus-basics",
    title: "Mathematics: Calculus Basics",
    titleAr: "الرياضيات: أساسيات التفاضل",
    description: "Limits, derivatives and their applications — built up step by step with lots of examples. Free for all students.",
    descriptionAr: "النهايات والمشتقات وتطبيقاتها — خطوة بخطوة مع الكثير من الأمثلة. مجاني لكل الطلاب.",
    subject: "Mathematics",
    thumbnail: MATH_IMG,
    priceCents: 0,
    isNew: true,
    lessons: [
      {
        title: "Limits",
        titleAr: "النهايات",
        duration: 20,
        content:
          "## Getting arbitrarily close\n\nThe limit of f(x) as x → a is the value f(x) approaches — even if f(a) itself is undefined.\n\n### Techniques\n1. **Direct substitution** when the function is continuous.\n2. **Factorise and cancel** for 0/0 forms.\n3. **Divide by the highest power** for limits at infinity.\n\n> Example: lim (x² − 1)/(x − 1) as x → 1 = lim (x + 1) = **2**.",
      },
      {
        title: "Derivatives",
        titleAr: "المشتقات",
        duration: 25,
        content:
          "## Instantaneous rate of change\n\nThe derivative f′(x) is the gradient of the tangent at x.\n\n### Rules\n- **Power rule**: d/dx xⁿ = n xⁿ⁻¹\n- **Sum rule**: differentiate term by term\n- **Product rule**: (uv)′ = u′v + uv′\n- **Chain rule**: d/dx f(g(x)) = f′(g(x)) · g′(x)\n\n### Examples\n- d/dx (3x⁴) = 12x³\n- d/dx (sin 2x) = 2 cos 2x",
        quiz: [{ q: "d/dx (x³) = ?", options: ["x²", "3x²", "3x", "x⁴ / 4"], correct: 1, explanation: "Power rule: bring the exponent down and subtract one." }],
      },
      {
        title: "Applications of Derivatives",
        titleAr: "تطبيقات المشتقات",
        duration: 22,
        content:
          "## Using the gradient\n\n### Stationary points\nSet f′(x) = 0. Then use f″(x): positive → minimum, negative → maximum.\n\n### Optimisation\n1. Write the quantity to optimise as a function of one variable.\n2. Differentiate and set to zero.\n3. Check it's a max/min and answer the question asked.\n\n### Rates of change\nIf a balloon's radius grows at 2 cm/s, how fast does its volume grow? Use the chain rule: dV/dt = dV/dr · dr/dt.",
      },
    ],
  },
];

const days = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

type SeedTask = { title: string; titleAr: string; description: string; descriptionAr: string; subject: string; due: number; demo?: { status: string; progress: number } };

const seedTasks: SeedTask[] = [
  { title: "Titration lab report", titleAr: "تقرير معمل المعايرة", description: "Write up the acid–base titration: method, results table, calculations and sources of error.", descriptionAr: "اكتب تقرير معايرة الحمض والقاعدة: الطريقة، جدول النتائج، الحسابات ومصادر الخطأ.", subject: "Chemistry", due: 2, demo: { status: "in_progress", progress: 60 } },
  { title: "Cell structure worksheet", titleAr: "ورقة عمل تركيب الخلية", description: "Label the animal and plant cell diagrams and answer questions 1–12.", descriptionAr: "ضع العناوين على رسم الخلية الحيوانية والنباتية وأجب عن الأسئلة من 1 إلى 12.", subject: "Biology", due: 1, demo: { status: "in_progress", progress: 30 } },
  { title: "Chapter 3: Newton's laws problem set", titleAr: "مسائل الفصل الثالث: قوانين نيوتن", description: "Solve problems 1–20 from chapter 3. Show free-body diagrams for each.", descriptionAr: "حل المسائل من 1 إلى 20 من الفصل الثالث مع رسم مخطط القوى لكل مسألة.", subject: "Physics", due: 4, demo: { status: "todo", progress: 0 } },
  { title: "Derivatives practice quiz prep", titleAr: "التحضير لاختبار المشتقات", description: "Revise the power, product and chain rules before Thursday's quiz.", descriptionAr: "راجع قواعد القوة والضرب والسلسلة قبل اختبار يوم الخميس.", subject: "Mathematics", due: 6, demo: { status: "todo", progress: 0 } },
  { title: "Periodic table flashcards", titleAr: "بطاقات الجدول الدوري", description: "Make flashcards for the first 20 elements: symbol, group, period, electron configuration.", descriptionAr: "اصنع بطاقات لأول 20 عنصراً: الرمز، المجموعة، الدورة، التوزيع الإلكتروني.", subject: "Chemistry", due: -1, demo: { status: "todo", progress: 10 } },
  { title: "Momentum conservation lab", titleAr: "معمل حفظ كمية الحركة", description: "Complete the trolley collision experiment and submit your data sheet.", descriptionAr: "أكمل تجربة تصادم العربات وسلّم ورقة البيانات.", subject: "Physics", due: 3, demo: { status: "done", progress: 100 } },
  { title: "Limits homework", titleAr: "واجب النهايات", description: "Exercises 4.1–4.3.", descriptionAr: "تمارين 4.1 إلى 4.3.", subject: "Mathematics", due: -9, demo: { status: "done", progress: 100 } },
  { title: "Atomic structure quiz", titleAr: "اختبار التركيب الذري", description: "Online quiz on protons, neutrons, electrons and isotopes.", descriptionAr: "اختبار إلكتروني عن البروتونات والنيوترونات والإلكترونات والنظائر.", subject: "Chemistry", due: -12, demo: { status: "done", progress: 100 } },
  { title: "Microscope drawing", titleAr: "رسم المجهر", description: "Draw and label a light microscope.", descriptionAr: "ارسم المجهر الضوئي مع كتابة أسماء أجزائه.", subject: "Biology", due: -14, demo: { status: "todo", progress: 0 } },
  { title: "Kinematics graphs worksheet", titleAr: "ورقة عمل رسوم الحركة", description: "Interpret the velocity–time graphs on page 42.", descriptionAr: "فسّر رسوم السرعة–الزمن في صفحة 42.", subject: "Physics", due: -16, demo: { status: "done", progress: 100 } },
  { title: "Bonding summary poster", titleAr: "ملصق تلخيص الروابط", description: "A one-page poster comparing ionic, covalent and metallic bonding.", descriptionAr: "ملصق من صفحة واحدة يقارن بين الروابط الأيونية والتساهمية والفلزية.", subject: "Chemistry", due: -20, demo: { status: "done", progress: 100 } },
  { title: "Genetics crosses practice", titleAr: "تدريب على التهجين الوراثي", description: "Complete the ten Punnett square problems.", descriptionAr: "حل مسائل مربع بانيت العشر.", subject: "Biology", due: -25, demo: { status: "done", progress: 100 } },
  { title: "Energy conservation problems", titleAr: "مسائل حفظ الطاقة", description: "Problems 1–15, chapter 5.", descriptionAr: "المسائل من 1 إلى 15، الفصل الخامس.", subject: "Physics", due: -30, demo: { status: "done", progress: 100 } },
];

const seedGrades = [
  { subject: "Chemistry", title: "Unit 1 quiz", titleAr: "اختبار الوحدة الأولى", kind: "quiz", score: 18, max: 20, daysAgo: 20 },
  { subject: "Chemistry", title: "Midterm exam", titleAr: "امتحان منتصف الفصل", kind: "exam", score: 42, max: 50, daysAgo: 10 },
  { subject: "Chemistry", title: "Lab report 1", titleAr: "تقرير المعمل 1", kind: "assignment", score: 9, max: 10, daysAgo: 6 },
  { subject: "Physics", title: "Kinematics quiz", titleAr: "اختبار علم الحركة", kind: "quiz", score: 14, max: 20, daysAgo: 18 },
  { subject: "Physics", title: "Midterm exam", titleAr: "امتحان منتصف الفصل", kind: "exam", score: 38, max: 50, daysAgo: 9 },
  { subject: "Biology", title: "Cells quiz", titleAr: "اختبار الخلايا", kind: "quiz", score: 19, max: 20, daysAgo: 15 },
  { subject: "Biology", title: "Genetics assignment", titleAr: "واجب الوراثة", kind: "assignment", score: 8, max: 10, daysAgo: 4 },
  { subject: "Mathematics", title: "Limits quiz", titleAr: "اختبار النهايات", kind: "quiz", score: 16, max: 20, daysAgo: 12 },
  { subject: "Mathematics", title: "Midterm exam", titleAr: "امتحان منتصف الفصل", kind: "exam", score: 45, max: 50, daysAgo: 8 },
];

let seeded = false;
let seeding: Promise<void> | null = null;

const YT = "https://www.youtube.com/watch?v=";
const VIDEO_BY_TITLE: Record<string, string> = {
  "Atomic Structure": `${YT}FSyAehMdpyI`,
  "The Periodic Table & Trends": `${YT}fPnwBITSmgU`,
  "Chemical Bonding": `${YT}FSyAehMdpyI`,
  "Stoichiometry & the Mole": `${YT}fPnwBITSmgU`,
  Hydrocarbons: `${YT}QnQe0xW_JY4`,
  "Functional Groups": `${YT}QnQe0xW_JY4`,
  "Reaction Types": `${YT}FSyAehMdpyI`,
  Kinematics: `${YT}fNk_zzaMoSs`,
  "Newton's Laws": `${YT}kKKM8Y-u7ds`,
  "Work, Energy & Power": `${YT}bHIhgxav9LY`,
  "Electric Charge & Fields": `${YT}bHIhgxav9LY`,
  "Current & Circuits": `${YT}bHIhgxav9LY`,
  "Magnetism & Induction": `${YT}bHIhgxav9LY`,
  "Cell Structure": `${YT}URUJD5NEXC8`,
  "Cell Division": `${YT}Q6ucKWIIFmg`,
  "Mendelian Genetics": `${YT}CBezq1fFUEA`,
  Limits: `${YT}WUvTyaaNkzM`,
  Derivatives: `${YT}WUvTyaaNkzM`,
  "Applications of Derivatives": `${YT}kYB8IZa5AuE`,
};

const TASK_META: Record<string, { type: string; attachment?: string }> = {
  "Titration lab report": { type: "lab", attachment: "titration-worksheet.txt" },
  "Cell structure worksheet": { type: "worksheet", attachment: "cell-diagrams.txt" },
  "Chapter 3: Newton's laws problem set": { type: "assignment", attachment: "chapter3-problems.txt" },
  "Derivatives practice quiz prep": { type: "quiz" },
  "Periodic table flashcards": { type: "worksheet" },
  "Momentum conservation lab": { type: "lab", attachment: "momentum-data-sheet.txt" },
  "Limits homework": { type: "assignment" },
  "Atomic structure quiz": { type: "quiz" },
  "Microscope drawing": { type: "worksheet", attachment: "microscope-template.txt" },
  "Kinematics graphs worksheet": { type: "worksheet", attachment: "velocity-graphs.txt" },
  "Bonding summary poster": { type: "assignment" },
  "Genetics crosses practice": { type: "worksheet", attachment: "punnett-practice.txt" },
  "Energy conservation problems": { type: "assignment" },
};

function attachmentBodyFor(title: string, description: string) {
  return [
    `${title} — student worksheet`,
    "",
    "Instructions:",
    `1. Read the task carefully: ${description}`,
    "2. Show all working and label every diagram.",
    "3. Write your final answers in the boxes below.",
    "",
    "Answer 1: ________________________________________",
    "",
    "Answer 2: ________________________________________",
    "",
    "Answer 3: ________________________________________",
    "",
    "Name: ______________________   Date: __________",
  ].join("\n");
}

let teacherSeeded = false;
export async function ensureSeeded() {
  await ensureBaseSeeded();
  if (!teacherSeeded) {
    await seedTeacherData();
    teacherSeeded = true;
  }
}

async function ensureBaseSeeded() {
  if (seeded) return;
  if (seeding) return seeding;
  seeding = (async () => {
    const [{ value }] = await db.select({ value: count() }).from(subjects);
    if (value > 0) {
      seeded = true;
      return;
    }

    const insertedSubjects = await db.insert(subjects).values(seedSubjects).returning();
    const subjectId = new Map(insertedSubjects.map((s) => [s.name, s.id]));

    const materialIdBySlug = new Map<string, number>();
    const lessonIdsByMaterial = new Map<string, number[]>();

    for (const m of seedMaterials) {
      const [material] = await db
        .insert(materials)
        .values({
          slug: m.slug,
          title: m.title,
          titleAr: m.titleAr,
          description: m.description,
          descriptionAr: m.descriptionAr,
          subjectId: subjectId.get(m.subject)!,
          thumbnailUrl: m.thumbnail,
          priceCents: m.priceCents,
          isNew: m.isNew,
        })
        .returning();
      materialIdBySlug.set(m.slug, material.id);

      const insertedLessons = await db
        .insert(lessons)
        .values(
          m.lessons.map((l, i) => ({
            materialId: material.id,
            title: l.title,
            titleAr: l.titleAr,
            content: l.content,
            videoUrl: VIDEO_BY_TITLE[l.title] ?? null,
            position: i + 1,
            durationMinutes: l.duration,
          })),
        )
        .returning();
      lessonIdsByMaterial.set(
        m.slug,
        insertedLessons.map((l) => l.id),
      );

      const questionRows = m.lessons.flatMap((l, i) =>
        (l.quiz ?? []).map((q) => ({
          lessonId: insertedLessons[i].id,
          question: q.q,
          options: q.options,
          correctIndex: q.correct,
          explanation: q.explanation ?? null,
        })),
      );
      if (questionRows.length) await db.insert(quizQuestions).values(questionRows);
    }

    const insertedTasks = await db
      .insert(tasks)
      .values(
        seedTasks.map((t) => {
          const meta = TASK_META[t.title];
          return {
            title: t.title,
            titleAr: t.titleAr,
            description: t.description,
            descriptionAr: t.descriptionAr,
            subjectId: subjectId.get(t.subject)!,
            taskType: meta?.type ?? "assignment",
            attachmentName: meta?.attachment ?? null,
            attachmentBody: meta?.attachment ? attachmentBodyFor(t.title, t.description) : "",
            dueDate: days(t.due),
          };
        }),
      )
      .returning();

    // Demo student
    const [demo] = await db
      .insert(users)
      .values({
        fullName: "Fatma Salah Mahmoud Ali",
        email: "fatma@anything.com",
        phone: "01012345678",
        parentPhone: "01098765432",
        studentCode: DEMO_STUDENT_CODE,
        passwordHash: hashPassword(DEMO_PASSWORD),
        qrToken: DEMO_QR_TOKEN,
        avatarUrl: AVATAR_IMG,
      })
      .onConflictDoNothing()
      .returning();
    if (!demo) {
      seeded = true;
      return;
    }

    await db.insert(taskProgress).values(
      insertedTasks.map((t, i) => ({
        userId: demo.id,
        taskId: t.id,
        status: seedTasks[i].demo?.status ?? "todo",
        progress: seedTasks[i].demo?.progress ?? 0,
      })),
    );

    const chem = materialIdBySlug.get("chemistry-fundamentals")!;
    const mech = materialIdBySlug.get("physics-mechanics")!;
    const bio = materialIdBySlug.get("biology-cells-and-genetics")!;
    await db.insert(purchases).values([
      { userId: demo.id, materialId: chem, pricePaidCents: 14999 },
      { userId: demo.id, materialId: mech, pricePaidCents: 0 },
    ]);
    await db.insert(lessonProgress).values([
      ...lessonIdsByMaterial.get("chemistry-fundamentals")!.slice(0, 2).map((lessonId) => ({ userId: demo.id, lessonId })),
      ...lessonIdsByMaterial.get("physics-mechanics")!.slice(0, 1).map((lessonId) => ({ userId: demo.id, lessonId })),
    ]);
    await db.insert(materialViews).values([
      { userId: demo.id, materialId: chem, viewedAt: days(0) },
      { userId: demo.id, materialId: mech, viewedAt: days(-1) },
      { userId: demo.id, materialId: bio, viewedAt: days(-3) },
    ]);
    await db.insert(grades).values(
      seedGrades.map((g) => ({
        userId: demo.id,
        subjectId: subjectId.get(g.subject)!,
        title: g.title,
        titleAr: g.titleAr,
        kind: g.kind,
        score: g.score,
        maxScore: g.max,
        gradedAt: days(-g.daysAgo),
      })),
    );

    seeded = true;
  })().finally(() => {
    seeding = null;
  });
  return seeding;
}
