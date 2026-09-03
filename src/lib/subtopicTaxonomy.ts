/**
 * Standardized Canonical Subtopic Repository for JEE (Main & Advanced) and NEET
 * Structured to maintain balanced diagnostic granularity without micro-fragmentation.
 */

export interface SubtopicDefinition {
  name: string;
  keywords: string[];
}

export interface ChapterDefinition {
  name: string;
  subtopics: SubtopicDefinition[];
}

export interface SubjectTaxonomy {
  subject: string;
  stream: "JEE" | "NEET" | "BOTH";
  chapters: ChapterDefinition[];
}

export const CANONICAL_TAXONOMY: Record<string, SubjectTaxonomy> = {
  Physics: {
    subject: "Physics",
    stream: "BOTH",
    chapters: [
      {
        name: "Units, Dimensions & Errors",
        subtopics: [
          { name: "Dimensional Analysis & Quantities", keywords: ["dimension", "dimensional formula", "units", "si unit"] },
          { name: "Errors, Significant Figures & Vernier/Screw Gauge", keywords: ["error", "percentage error", "vernier", "screw gauge", "least count"] },
        ],
      },
      {
        name: "Kinematics",
        subtopics: [
          { name: "Motion in a Straight Line (1D)", keywords: ["velocity", "acceleration", "displacement", "rectilinear", "speed"] },
          { name: "Projectile & Relative Motion (2D)", keywords: ["projectile", "trajectory", "range", "relative velocity", "river boat"] },
        ],
      },
      {
        name: "Laws of Motion & Friction",
        subtopics: [
          { name: "Newton's Laws & Free Body Diagrams", keywords: ["newton", "force", "fbd", "tension", "pulley", "normal force"] },
          { name: "Static & Kinetic Friction", keywords: ["friction", "coefficient of friction", "limiting friction", "banking of road"] },
        ],
      },
      {
        name: "Work, Energy & Power",
        subtopics: [
          { name: "Work-Energy Theorem & Conservative Forces", keywords: ["work", "kinetic energy", "potential energy", "spring force"] },
          { name: "Power & Collisions (Elastic/Inelastic)", keywords: ["power", "collision", "coefficient of restitution", "momentum conservation"] },
        ],
      },
      {
        name: "Rotational Dynamics & Gravitation",
        subtopics: [
          { name: "Center of Mass & Moment of Inertia", keywords: ["center of mass", "moment of inertia", "parallel axis", "radius of gyration"] },
          { name: "Torque, Angular Momentum & Rolling Motion", keywords: ["torque", "angular momentum", "rolling without slipping", "pure rolling"] },
          { name: "Gravitation, Orbital Velocity & Kepler's Laws", keywords: ["gravitation", "escape velocity", "orbital", "kepler", "gravitational field"] },
        ],
      },
      {
        name: "Mechanics of Solids & Fluids",
        subtopics: [
          { name: "Elasticity, Stress & Strain", keywords: ["young's modulus", "bulk modulus", "stress", "strain", "hooke's law"] },
          { name: "Fluid Statics, Viscosity & Surface Tension", keywords: ["pressure", "buoyancy", "pascal", "viscosity", "stokes", "terminal velocity", "surface tension", "capillarity"] },
          { name: "Fluid Dynamics & Bernoulli's Principle", keywords: ["bernoulli", "equation of continuity", "torricelli", "venturimeter"] },
        ],
      },
      {
        name: "Thermal Physics & Thermodynamics",
        subtopics: [
          { name: "Thermal Expansion, Calorimetry & Heat Transfer", keywords: ["calorimetry", "specific heat", "latent heat", "conduction", "radiation", "stefan", "wien"] },
          { name: "Kinetic Theory of Gases & Gas Laws", keywords: ["ktg", "rms velocity", "mean free path", "degrees of freedom", "equipartition"] },
          { name: "First & Second Laws of Thermodynamics", keywords: ["isothermal", "adiabatic", "isobaric", "carnot", "efficiency", "entropy", "first law"] },
        ],
      },
      {
        name: "Oscillations & Waves",
        subtopics: [
          { name: "Simple Harmonic Motion (SHM)", keywords: ["shm", "simple pendulum", "spring mass", "time period", "frequency", "restoring force"] },
          { name: "Sound Waves & Doppler Effect", keywords: ["sound wave", "organ pipe", "beats", "resonance", "doppler effect", "speed of sound"] },
        ],
      },
      {
        name: "Electrostatics & Capacitance",
        subtopics: [
          { name: "Coulomb's Law, Electric Field & Gauss Law", keywords: ["coulomb", "electric field", "dipole", "gauss law", "flux"] },
          { name: "Electric Potential & Capacitors", keywords: ["potential", "capacitance", "parallel plate", "dielectric", "energy stored in capacitor"] },
        ],
      },
      {
        name: "Current Electricity & Magnetism",
        subtopics: [
          { name: "Ohm's Law, Kirchhoff's Laws & Resistive Circuits", keywords: ["ohm", "resistor", "kirchhoff", "wheatstone", "potentiometer", "meter bridge"] },
          { name: "Biot-Savart Law, Ampere Law & Magnetic Force", keywords: ["biot-savart", "lorentz force", "cyclotron", "magnetic field", "solenoid", "ampere"] },
          { name: "Magnetic Dipole, Earth Magnetism & Materials", keywords: ["magnetic moment", "paramagnetic", "diamagnetic", "ferromagnetic", "hysteresis", "earth's magnetism"] },
        ],
      },
      {
        name: "Electromagnetic Induction & AC",
        subtopics: [
          { name: "Faraday's Law, Lenz Law & Inductance", keywords: ["faraday", "lenz", "induced emf", "self inductance", "mutual inductance", "eddy current"] },
          { name: "Alternating Current & LCR Circuits", keywords: ["ac", "lcr circuit", "resonance in ac", "power factor", "transformer", "impedance"] },
        ],
      },
      {
        name: "Optics & Modern Physics",
        subtopics: [
          { name: "Ray Optics (Reflection, Refraction, Lenses & Prisms)", keywords: ["lens", "mirror", "prism", "refraction", "total internal reflection", "optical instruments"] },
          { name: "Wave Optics (Interference, Diffraction & Polarization)", keywords: ["interference", "ydse", "young's double slit", "diffraction", "polarization", "brewster"] },
          { name: "Photoelectric Effect, Dual Nature & Bohr Model", keywords: ["photoelectric", "work function", "de broglie", "bohr model", "hydrogen spectrum", "energy levels"] },
          { name: "Nuclear Physics, Radioactivity & Semiconductors", keywords: ["nuclear binding energy", "radioactivity", "half life", "semiconductor", "pn junction", "diode", "transistor", "logic gates"] },
        ],
      },
    ],
  },

  Chemistry: {
    subject: "Chemistry",
    stream: "BOTH",
    chapters: [
      {
        name: "Some Basic Concepts of Chemistry & Atomic Structure",
        subtopics: [
          { name: "Mole Concept, Stoichiometry & Concentration Terms", keywords: ["mole", "molarity", "molality", "limiting reagent", "stoichiometry", "ppm", "normality"] },
          { name: "Atomic Models, Quantum Numbers & Electronic Configuration", keywords: ["bohr", "quantum numbers", "heisenberg", "pauli", "hund", "orbital", "photoelectric"] },
        ],
      },
      {
        name: "Chemical Bonding & Molecular Structure",
        subtopics: [
          { name: "VSEPR Theory & Molecular Geometry", keywords: ["vsepr", "hybridization", "lone pair", "bond angle", "geometry"] },
          { name: "Molecular Orbital Theory & Hydrogen Bonding", keywords: ["mot", "bond order", "magnetic behavior", "hydrogen bond", "dipole moment"] },
        ],
      },
      {
        name: "Thermodynamics & Thermochemistry",
        subtopics: [
          { name: "First Law, Enthalpy & Hess's Law", keywords: ["enthalpy", "internal energy", "work done", "hess law", "heat of reaction"] },
          { name: "Entropy, Gibbs Free Energy & Spontaneity", keywords: ["entropy", "gibbs free energy", "spontaneity", "second law", "delta g"] },
        ],
      },
      {
        name: "Chemical & Ionic Equilibrium",
        subtopics: [
          { name: "Chemical Equilibrium & Le Chatelier's Principle", keywords: ["kp", "kc", "equilibrium constant", "le chatelier", "reaction quotient"] },
          { name: "pH, Buffer Solutions & Solubility Product", keywords: ["ph", "buffer", "henderson", "ksp", "solubility product", "common ion effect", "hydrolysis of salts"] },
        ],
      },
      {
        name: "Redox Reactions & Electrochemistry",
        subtopics: [
          { name: "Redox Balancing & Oxidation Numbers", keywords: ["oxidation number", "redox", "balancing redox", "disproportionation"] },
          { name: "Galvanic Cells, Nernst Equation & Conductance", keywords: ["nernst equation", "emf", "standard electrode potential", "kohlrausch", "faraday's law", "conductance"] },
        ],
      },
      {
        name: "Chemical Kinetics & Surface Chemistry",
        subtopics: [
          { name: "Rate of Reaction, Order & Integrated Rate Equations", keywords: ["rate law", "order of reaction", "first order", "half life", "rate constant"] },
          { name: "Arrhenius Equation & Catalysis", keywords: ["arrhenius", "activation energy", "catalyst", "adsorption", "colloids"] },
        ],
      },
      {
        name: "Inorganic Chemistry: Periodic Trends & Coordination",
        subtopics: [
          { name: "Periodic Properties (IE, EA, Electronegativity, Radii)", keywords: ["ionization energy", "electron gain enthalpy", "electronegativity", "atomic radius", "periodic table"] },
          { name: "p-Block, d-Block & f-Block Elements", keywords: ["p-block", "d-block", "f-block", "transition elements", "lanthanoids", "oxidation states"] },
          { name: "Coordination Compounds, Isomerism & CFT", keywords: ["coordination compound", "ligand", "iupac naming coordination", "crystal field theory", "isomerism in complexes", "werner"] },
        ],
      },
      {
        name: "Organic Chemistry Fundamentals (GOC)",
        subtopics: [
          { name: "IUPAC Nomenclature & Structural Isomerism", keywords: ["iupac", "nomenclature", "isomerism", "chain", "positional", "functional"] },
          { name: "Electronic Effects (Inductive, Resonance, Hyperconjugation)", keywords: ["inductive effect", "resonance", "mesomeric", "hyperconjugation", "aromaticity", "huckel"] },
          { name: "Reaction Intermediates & Stereochemistry", keywords: ["carbocation", "carbanion", "free radical", "enantiomers", "diastereomers", "chirality", "r/s configuration"] },
        ],
      },
      {
        name: "Hydrocarbons & Haloalkanes",
        subtopics: [
          { name: "Alkanes, Alkenes, Alkynes & Aromatic Hydrocarbons", keywords: ["alkane", "alkene", "alkyne", "electrophilic addition", "markovnikov", "ozonolysis", "benzene", "friedel crafts"] },
          { name: "Haloalkanes, Haloarenes & Substitution/Elimination (SN1, SN2, E1, E2)", keywords: ["haloalkane", "sn1", "sn2", "e1", "e2", "nucleophilic substitution", "grignard reagent"] },
        ],
      },
      {
        name: "Oxygen, Nitrogen & Biomolecules",
        subtopics: [
          { name: "Alcohols, Phenols & Ethers", keywords: ["alcohol", "phenol", "ether", "lucas test", "reimer tiemann", "kolbe", "williamson"] },
          { name: "Aldehydes, Ketones & Carboxylic Acids", keywords: ["aldehyde", "ketone", "carboxylic acid", "aldol", "cannizzaro", "clemmensen", "tollens", "fehling"] },
          { name: "Amines, Diazonium Salts & Biomolecules", keywords: ["amine", "diazonium", "hoffmann bromamide", "carbylamine", "amino acid", "protein", "carbohydrates", "dna", "rna"] },
        ],
      },
    ],
  },

  Mathematics: {
    subject: "Mathematics",
    stream: "JEE",
    chapters: [
      {
        name: "Sets, Relations & Functions",
        subtopics: [
          { name: "Sets & Types of Relations", keywords: ["set", "subset", "equivalence relation", "reflexive", "symmetric", "transitive"] },
          { name: "Domain, Range & Types of Functions", keywords: ["domain", "range", "one-one", "onto", "bijective", "composite function", "inverse function"] },
        ],
      },
      {
        name: "Algebra: Complex Numbers & Quadratic Equations",
        subtopics: [
          { name: "Complex Numbers & Modulus/Argument", keywords: ["complex number", "modulus", "argument", "argand plane", "euler formula", "cube roots of unity"] },
          { name: "Quadratic Equations, Roots & Location of Roots", keywords: ["quadratic equation", "discriminant", "sum of roots", "product of roots", "location of roots", "nature of roots"] },
        ],
      },
      {
        name: "Matrices, Determinants & System of Linear Equations",
        subtopics: [
          { name: "Matrix Operations, Inverse & Adjoint", keywords: ["matrix", "transpose", "symmetric matrix", "skew-symmetric", "adjoint", "inverse of matrix"] },
          { name: "Properties of Determinants & Cramer's Rule", keywords: ["determinant", "cramer's rule", "system of linear equations", "consistent", "infinite solutions"] },
        ],
      },
      {
        name: "Sequences, Series & Binomial Theorem",
        subtopics: [
          { name: "Arithmetic, Geometric & Harmonic Progressions (AP, GP, HP)", keywords: ["ap", "gp", "arithmetic progression", "geometric progression", "sum of n terms", "infinite gp", "am-gm inequality"] },
          { name: "Binomial Theorem, General Term & Coefficients", keywords: ["binomial theorem", "general term", "middle term", "binomial coefficient", "remainder theorem"] },
        ],
      },
      {
        name: "Permutations, Combinations & Probability",
        subtopics: [
          { name: "Permutations, Combinations & Counting Principles", keywords: ["permutation", "combination", "ncr", "npr", "derangement", "circular permutation"] },
          { name: "Classical Probability, Conditional Probability & Bayes' Theorem", keywords: ["probability", "conditional probability", "bayes theorem", "independent events", "bernoulli trials"] },
        ],
      },
      {
        name: "Trigonometry & Inverse Trigonometric Functions",
        subtopics: [
          { name: "Trigonometric Ratios, Compound Angles & Equations", keywords: ["sin", "cos", "tan", "compound angle", "multiple angle", "trigonometric equation"] },
          { name: "Inverse Trigonometric Functions (ITF) & Properties", keywords: ["inverse trig", "arcsin", "arccos", "arctan", "domain of itf", "principal value"] },
        ],
      },
      {
        name: "Coordinate Geometry: Straight Lines & Circles",
        subtopics: [
          { name: "Straight Lines, Slope & Distance Formulas", keywords: ["straight line", "slope", "intercept", "concurrency", "pair of straight lines", "angle between lines"] },
          { name: "Circles, Tangents, Normals & Family of Circles", keywords: ["circle", "tangent to circle", "normal to circle", "chord of contact", "director circle", "orthogonal circles"] },
        ],
      },
      {
        name: "Conic Sections",
        subtopics: [
          { name: "Parabola (Standard Forms, Tangent, Normal)", keywords: ["parabola", "focus", "directrix", "latus rectum", "tangent to parabola", "focal chord"] },
          { name: "Ellipse & Hyperbola (Eccentricity, Tangent, Asymptotes)", keywords: ["ellipse", "hyperbola", "eccentricity", "foci", "tangent to ellipse", "asymptotes", "rectangular hyperbola"] },
        ],
      },
      {
        name: "Differential Calculus",
        subtopics: [
          { name: "Limits, Continuity & Differentiability", keywords: ["limit", "l'hopital", "continuity", "differentiability", "left hand limit", "right hand limit"] },
          { name: "Methods of Differentiation & Chain Rule", keywords: ["derivative", "differentiation", "chain rule", "implicit differentiation", "parametric derivative", "logarithmic differentiation"] },
          { name: "Applications of Derivatives (Monotonicity, Maxima/Minima, Tangents)", keywords: ["maxima", "minima", "increasing function", "decreasing function", "tangent and normal", "rolle's theorem", "lmvt"] },
        ],
      },
      {
        name: "Integral Calculus",
        subtopics: [
          { name: "Indefinite Integration & Substitution Methods", keywords: ["indefinite integral", "integration by parts", "partial fractions", "substitution"] },
          { name: "Definite Integrals & King's Property", keywords: ["definite integral", "king's property", "leibnitz rule", "periodic integral", "area under curve"] },
          { name: "Differential Equations (Variable Separable, Linear)", keywords: ["differential equation", "order and degree", "variable separable", "integrating factor", "linear differential equation"] },
        ],
      },
      {
        name: "Vectors & 3D Geometry",
        subtopics: [
          { name: "Vector Algebra (Dot Product, Cross Product, Scalar Triple Product)", keywords: ["vector", "dot product", "cross product", "scalar triple product", "vector triple product", "projection of vector"] },
          { name: "Three Dimensional Geometry (Lines & Planes)", keywords: ["3d geometry", "direction cosines", "direction ratios", "equation of line in 3d", "shortest distance between skew lines", "plane"] },
        ],
      },
    ],
  },

  Botany: {
    subject: "Botany",
    stream: "NEET",
    chapters: [
      {
        name: "Diversity in the Living World & Plant Kingdom",
        subtopics: [
          { name: "Biological Classification (Monera, Protista, Fungi, Viruses)", keywords: ["monera", "protista", "fungi", "virus", "viroids", "lichens", "mycorrhiza"] },
          { name: "Plant Kingdom (Algae, Bryophytes, Pteridophytes, Gymnosperms, Angiosperms)", keywords: ["algae", "bryophytes", "pteridophytes", "gymnosperms", "angiosperms", "alternation of generations"] },
        ],
      },
      {
        name: "Morphology & Anatomy of Flowering Plants",
        subtopics: [
          { name: "Plant Morphology (Root, Stem, Leaf, Inflorescence, Flower, Seed)", keywords: ["root", "stem", "leaf", "inflorescence", "flower", "fruit", "seed", "placentation", "aestivation"] },
          { name: "Plant Anatomy (Meristematic & Permanent Tissues, Secondary Growth)", keywords: ["xylem", "phloem", "stomata", "monocot stem", "dicot stem", "cambium", "secondary growth", "annual rings"] },
        ],
      },
      {
        name: "Cell Biology & Biomolecules",
        subtopics: [
          { name: "Cell Structure & Organelles (Chloroplast, Mitochondria, ER, Golgi)", keywords: ["cell theory", "chloroplast", "mitochondria", "ribosome", "nucleus", "membrane", "endoplasmic reticulum"] },
          { name: "Cell Cycle & Cell Division (Mitosis, Meiosis)", keywords: ["cell cycle", "mitosis", "meiosis", "prophase", "crossing over", "chiasmata", "cytokinesis", "g1 phase"] },
        ],
      },
      {
        name: "Plant Physiology",
        subtopics: [
          { name: "Photosynthesis in Higher Plants (Light Reaction, C3, C4, CAM Pathways)", keywords: ["photosynthesis", "chlorophyll", "c3 pathway", "c4 pathway", "calvin cycle", "light reaction", "photorespiration", "rubisco"] },
          { name: "Respiration in Plants (Glycolysis, Krebs Cycle, ETS)", keywords: ["glycolysis", "krebs cycle", "fermentation", "aerobic respiration", "electron transport system", "atp synthase"] },
          { name: "Plant Growth, Development & Phytohormones", keywords: ["auxin", "gibberellin", "cytokinin", "ethylene", "abscisic acid", "photoperiodism", "vernalization"] },
        ],
      },
      {
        name: "Reproduction in Flowering Plants",
        subtopics: [
          { name: "Microsporogenesis & Megasporogenesis (Pollen & Embryo Sac)", keywords: ["pollen grain", "microsporogenesis", "megasporogenesis", "embryo sac", "ovule", "anther"] },
          { name: "Pollination, Double Fertilization & Endosperm", keywords: ["pollination", "double fertilization", "triple fusion", "endosperm", "apomixis", "polyembryony"] },
        ],
      },
      {
        name: "Genetics & Molecular Basis of Inheritance",
        subtopics: [
          { name: "Mendelian Genetics, Linkage & Non-Mendelian Inheritance", keywords: ["mendel", "monohybrid", "dihybrid", "incomplete dominance", "codominance", "linkage", "recombination", "pedigree"] },
          { name: "Structure of DNA/RNA, Replication, Transcription & Translation", keywords: ["dna replication", "transcription", "translation", "genetic code", "lac operon", "human genome project"] },
        ],
      },
      {
        name: "Ecology & Environment",
        subtopics: [
          { name: "Organisms, Populations & Ecological Adaptations", keywords: ["population ecology", "adaptations", "growth curves", "interaction", "mutualism", "parasitism", "predation"] },
          { name: "Ecosystem Dynamics, Nutrient Cycles & Biodiversity", keywords: ["food chain", "food web", "ecological pyramids", "carbon cycle", "biodiversity", "conservation", "national parks"] },
        ],
      },
    ],
  },

  Zoology: {
    subject: "Zoology",
    stream: "NEET",
    chapters: [
      {
        name: "Animal Kingdom Classification",
        subtopics: [
          { name: "Non-Chordates (Porifera to Echinodermata)", keywords: ["porifera", "coelenterata", "platyhelminthes", "annelida", "arthropoda", "mollusca", "echinodermata", "coelom"] },
          { name: "Chordates & Vertebrata (Pisces, Amphibia, Reptilia, Aves, Mammalia)", keywords: ["chordata", "notochord", "cyclostomata", "chondrichthyes", "osteichthyes", "amphibia", "reptilia", "aves", "mammals"] },
        ],
      },
      {
        name: "Structural Organisation in Animals",
        subtopics: [
          { name: "Animal Tissues (Epithelial, Connective, Muscular, Neural)", keywords: ["epithelium", "squamous", "cuboidal", "cartilage", "bone", "blood", "muscle fiber", "neuron"] },
          { name: "Organ Morphology (Cockroach & Frog Anatomy)", keywords: ["cockroach", "frog", "alimentary canal of cockroach", "spiracles", "malpighian tubules"] },
        ],
      },
      {
        name: "Human Physiology: Digestion, Breathing & Circulation",
        subtopics: [
          { name: "Breathing & Exchange of Gases", keywords: ["respiratory system", "alveoli", "oxygen dissociation curve", "tidal volume", "vital capacity", "emphysema"] },
          { name: "Body Fluids & Circulation (Heart, Blood Groups, ECG)", keywords: ["heart", "cardiac cycle", "blood pressure", "ecg", "blood group", "rh factor", "pacemaker", "double circulation"] },
        ],
      },
      {
        name: "Human Physiology: Excretion, Locomotion & Coordination",
        subtopics: [
          { name: "Excretory Products & Urine Formation (Nephron, RAAS)", keywords: ["kidney", "nephron", "glomerular filtration", "counter current mechanism", "raas", "aldosterone", "micturition"] },
          { name: "Locomotion, Muscles & Skeletal System", keywords: ["sarcomere", "actin", "myosin", "sliding filament theory", "joints", "synovial joint", "cranial bones", "osteoporosis"] },
          { name: "Neural Control, Sense Organs & Endocrine System", keywords: ["neuron", "synapse", "reflex arc", "brain", "eye", "ear", "pituitary", "thyroid", "adrenal", "insulin", "hormones"] },
        ],
      },
      {
        name: "Human Reproduction & Reproductive Health",
        subtopics: [
          { name: "Male & Female Reproductive Systems, Gametogenesis", keywords: ["spermatogenesis", "oogenesis", "testis", "ovary", "graafian follicle", "sertoli cells", "semen"] },
          { name: "Menstrual Cycle, Fertilization, Pregnancy & Contraception", keywords: ["menstrual cycle", "ovulation", "fertilization", "blastocyst", "implantation", "placenta", "contraceptive", "art", "ivf"] },
        ],
      },
      {
        name: "Evolution & Human Health",
        subtopics: [
          { name: "Origin of Life, Evidence of Evolution & Natural Selection", keywords: ["evolution", "darwin", "homologous", "analogous", "hardy weinberg", "adaptive radiation", "fossil"] },
          { name: "Human Health, Immunity, Infectious Diseases & Cancer", keywords: ["immunity", "antibodies", "innate immunity", "vaccines", "malaria", "typhoid", "aids", "hiv", "cancer", "drugs"] },
        ],
      },
      {
        name: "Biotechnology & Applications",
        subtopics: [
          { name: "Biotechnology Principles & Processes (Recombinant DNA, PCR, Gel Electrophoresis)", keywords: ["restriction enzyme", "pcr", "gel electrophoresis", "plasmid", "cloning vector", "ligase", "bioreactor"] },
          { name: "Biotechnology Applications (Bt Cotton, Gene Therapy, Transgenic Animals)", keywords: ["bt cotton", "rna interference", "insulin production", "gene therapy", "transgenic animals", "elisa"] },
        ],
      },
    ],
  },
};

/** Get all canonical subjects */
export function getCanonicalSubjects(): string[] {
  return Object.keys(CANONICAL_TAXONOMY);
}

/** Get chapters for a subject */
export function getCanonicalChapters(subject: string): ChapterDefinition[] {
  const normSubject = normalizeSubjectName(subject);
  return CANONICAL_TAXONOMY[normSubject]?.chapters || [];
}

/** Normalize subject alias to canonical subject name */
export function normalizeSubjectName(subject: string): string {
  const s = subject.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/^(PHY|PHYSICS)$/.test(s)) return "Physics";
  if (/^(CHE|CHEM|CHEMISTRY)$/.test(s)) return "Chemistry";
  if (/^(MAT|MATH|MATHS|MATHEMATICS)$/.test(s)) return "Mathematics";
  if (/^(BOT|BOTANY)$/.test(s)) return "Botany";
  if (/^(ZOO|ZOOLOGY)$/.test(s)) return "Zoology";
  if (/^(BIO|BIOLOGY)$/.test(s)) return "Biology";
  return subject;
}

/** Best-effort fuzzy match question text against canonical taxonomy */
export function findBestMatchingSubtopic(
  subject: string,
  questionText: string
): { chapter: string; subtopic: string } | null {
  const normSubject = normalizeSubjectName(subject);
  const tax = CANONICAL_TAXONOMY[normSubject];
  if (!tax) return null;

  const lowerText = questionText.toLowerCase();
  let bestMatch: { chapter: string; subtopic: string; score: number } | null = null;

  for (const ch of tax.chapters) {
    for (const st of ch.subtopics) {
      let score = 0;
      for (const kw of st.keywords) {
        if (lowerText.includes(kw.toLowerCase())) {
          score += kw.length;
        }
      }
      if (score > (bestMatch?.score ?? 0)) {
        bestMatch = { chapter: ch.name, subtopic: st.name, score };
      }
    }
  }

  if (bestMatch && bestMatch.score > 0) {
    return { chapter: bestMatch.chapter, subtopic: bestMatch.subtopic };
  }

  // Fallback to first chapter/subtopic if no direct keyword match
  return {
    chapter: tax.chapters[0]?.name || "General",
    subtopic: tax.chapters[0]?.subtopics[0]?.name || "Core Principles",
  };
}
