export interface SyllabusTopic {
  subject: "PHYSICS" | "CHEMISTRY" | "BOTANY" | "ZOOLOGY";
  chapter: string;
  subtopics: string[];
}

export const NEET_SYLLABUS: SyllabusTopic[] = [
  {
    subject: "ZOOLOGY",
    chapter: "Structural Organisation in Animals",
    subtopics: [
      "Frog Morphology",
      "Frog Digestive System",
      "Frog Vascular System",
      "Frog Respiration",
      "Frog Excretory System",
      "Frog Nervous System",
      "Frog Reproductive System"
    ]
  },
  {
    subject: "BOTANY",
    chapter: "Biological Classification",
    subtopics: [
      "Kingdom Monera",
      "Kingdom Protista",
      "Kingdom Fungi",
      "Viruses, Viroids, Prions and Lichens"
    ]
  },
  {
    subject: "CHEMISTRY",
    chapter: "Some Basic Principles and Techniques (Organic Chemistry)",
    subtopics: [
      "IUPAC Nomenclature of Organic Compounds",
      "Classification of Organic Compounds",
      "Isomerism",
      "Electronic Displacements in Covalent Bonds"
    ]
  },
  {
    subject: "CHEMISTRY",
    chapter: "Chemical Bonding and Molecular Structure",
    subtopics: [
      "Kossel-Lewis Approach and Ionic Bonding",
      "Covalent Bonding and Bond Parameters",
      "Dipole Moment",
      "Valence Shell Electron Pair Repulsion (VSEPR) Theory",
      "Hybridization",
      "Molecular Orbital Theory",
      "Hydrogen Bonding"
    ]
  },
  {
    subject: "PHYSICS",
    chapter: "Work, Energy and Power",
    subtopics: [
      "Work Done by Constant and Variable Forces",
      "Kinetic Energy and Work-Energy Theorem",
      "Potential Energy and Conservation of Mechanical Energy",
      "Potential Energy of a Spring",
      "Conservative and Non-Conservative Forces",
      "Power",
      "Collisions"
    ]
  },
  {
    subject: "PHYSICS",
    chapter: "Laws of Motion",
    subtopics: [
      "Newton's First Law and Inertia",
      "Newton's Second Law, Momentum, and Force Vectors",
      "Newton's Third Law and Action-Reaction Pairs",
      "Equilibrium of a Particle and Pulley Systems",
      "Friction on Rough Surfaces",
      "Circular Motion and Pseudo Forces",
      "Conservation of Linear Momentum and Recoil Speed"
    ]
  },
  {
    subject: "PHYSICS",
    chapter: "Motion in a Plane (Kinematics)",
    subtopics: [
      "Scalars and Vectors",
      "Vector Addition, Subtraction, and Unit Vectors",
      "Motion in a Plane with Constant Acceleration",
      "Projectile Motion and Trajectory",
      "Uniform Circular Motion"
    ]
  },
  {
    subject: "PHYSICS",
    chapter: "Motion in a Straight Line",
    subtopics: [
      "Position, Path Length, and Displacement",
      "Average Velocity and Average Speed",
      "Instantaneous Velocity and Speed",
      "Acceleration",
      "Kinematic Equations for Uniformly Accelerated Motion"
    ]
  }
];
