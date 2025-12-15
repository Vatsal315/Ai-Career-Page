export interface ResumeInputData {
  personalInfo: {
    name: string;
    email: string;
    phone?: string;
    linkedin?: string;
    portfolio?: string;
    address?: string;
  };
  summary?: string;
  education: {
    institution: string;
    degree: string;
    fieldOfStudy?: string;
    startDate?: string;
    endDate?: string;
    details?: string[];
  }[];
  experience: {
    jobTitle: string;
    company: string;
    location?: string;
    startDate: string;
    endDate: string;
    responsibilities: string[];
  }[];
  skills: {
    category?: string;
    items: string[];
  }[];
  certifications?: {
    name: string;
    issuingOrganization?: string;
    dateObtained?: string;
  }[];
  projects?: {
    name: string;
    description: string;
    technologies?: string[];
    link?: string;
  }[];
  targetJobRole?: string;
  targetJobDescription?: string;
}

export type ResumeTemplate = {
  id: string;
  name: string;
  description: string;
  tag: string;
  previewSrc: string;
  data: ResumeInputData;
};

export const resumeTemplates: ResumeTemplate[] = [
  {
    id: "classic-ats",
    name: "Classic ATS",
    description: "Clean, recruiter-friendly layout optimized for ATS parsing.",
    tag: "Most Popular",
    previewSrc: "/resume-templates/template-1.png",
    data: {
      personalInfo: {
        name: "Jake Ryan",
        email: "jake@su.edu",
        phone: "123-456-7890",
        linkedin: "linkedin.com/in/jake",
        portfolio: "github.com/jake",
        address: "Georgetown, TX",
      },
      summary:
        "Computer Science graduate with strong full‑stack experience (React, Flask/FastAPI, PostgreSQL). Passionate about building scalable web apps and data-driven products.",
      education: [
        {
          institution: "Southwestern University",
          degree: "Bachelor of Arts",
          fieldOfStudy: "Computer Science (Minor in Business)",
          startDate: "2018-08",
          endDate: "2021-05",
          details: ["Relevant coursework: Data Structures, Algorithms", "GPA: 3.6/4.0"],
        },
      ],
      experience: [
        {
          jobTitle: "Undergraduate Research Assistant",
          company: "Texas A&M University",
          location: "College Station, TX",
          startDate: "2020-06",
          endDate: "Present",
          responsibilities: [
            "Developed a REST API using FastAPI and PostgreSQL to store data from learning management systems.",
            "Built a full‑stack app with Flask + React to analyze GitHub data.",
            "Explored data visualization techniques for collaboration insights.",
          ],
        },
        {
          jobTitle: "IT Support Specialist",
          company: "Southwestern University",
          location: "Georgetown, TX",
          startDate: "2018-09",
          endDate: "Present",
          responsibilities: [
            "Troubleshot campus computer issues for students and staff.",
            "Maintained computer labs and classroom equipment.",
          ],
        },
      ],
      skills: [
        { category: "Languages", items: ["Java", "Python", "JavaScript", "SQL", "HTML/CSS"] },
        { category: "Frameworks", items: ["React", "FastAPI", "Flask", "Node.js", "Express"] },
        { category: "Tools", items: ["Git", "Docker", "PostgreSQL"] },
      ],
      projects: [
        {
          name: "Gitlytics",
          description: "Full‑stack GitHub analytics dashboard with REST API and React UI.",
          technologies: ["Python", "Flask", "React", "PostgreSQL", "Docker"],
        },
      ],
      targetJobRole: "Software Engineer",
      targetJobDescription: "Seeking a software engineering role focused on full‑stack development and scalable APIs.",
    },
  },
  {
    id: "modern-blue",
    name: "Modern Blue",
    description: "Modern section headers with a clean, professional hierarchy.",
    tag: "Modern",
    previewSrc: "/resume-templates/template-2.png",
    data: {
      personalInfo: {
        name: "First Last",
        email: "firstlast@gmail.com",
        phone: "123-456-7890",
        linkedin: "linkedin.com/in/firstlast",
        portfolio: "github.com/firstlast",
        address: "City, State",
      },
      summary:
        "Software Engineer with experience building web apps, improving performance, and collaborating across teams. Strong fundamentals in systems, APIs, and modern frameworks.",
      education: [
        {
          institution: "University Name",
          degree: "Bachelor of Science",
          fieldOfStudy: "Computer Science",
          startDate: "2019-08",
          endDate: "2023-05",
          details: [
            "GPA: 4.0 / 4.0",
            "Relevant coursework: Data Structures & Algorithms, Linear Algebra",
          ],
        },
      ],
      experience: [
        {
          jobTitle: "Software Engineer",
          company: "Company Name 1",
          location: "City, State",
          startDate: "2023-01",
          endDate: "2024-05",
          responsibilities: [
            "Implemented microservices architecture using Node.js and Express, improving API response time by 25%.",
            "Led a cross‑functional team to deliver a feature that increased engagement by 20%.",
            "Optimized MySQL queries, reducing page load time by 15%.",
          ],
        },
        {
          jobTitle: "Software Engineer Intern",
          company: "Company Name 2",
          location: "City, State",
          startDate: "2022-05",
          endDate: "2022-08",
          responsibilities: [
            "Built responsive UI components, improving user satisfaction scores by 15%.",
            "Introduced automated tests (Jest), increasing coverage by 30%.",
          ],
        },
      ],
      skills: [
        { category: "Languages", items: ["TypeScript", "JavaScript", "Python", "SQL"] },
        { category: "Technologies", items: ["React", "Node.js", "Express", "MySQL", "Docker"] },
        { category: "Concepts", items: ["REST APIs", "System Design", "CI/CD"] },
      ],
      projects: [
        {
          name: "Project Name 1",
          description: "Microservices-based platform with real-time features and analytics.",
          technologies: ["Node.js", "React", "WebSocket"],
        },
      ],
      targetJobRole: "Software Engineer",
      targetJobDescription: "Target roles involving React + Node.js, APIs, and performance optimization.",
    },
  },
  {
    id: "minimal-serif",
    name: "Minimal Serif",
    description: "Elegant, minimal look for a polished, premium feel.",
    tag: "Elegant",
    previewSrc: "/resume-templates/template-3.png",
    data: {
      personalInfo: {
        name: "First Last",
        email: "firstlast@gmail.com",
        phone: "123-456-7890",
        linkedin: "linkedin.com/in/firstlast",
        portfolio: "github.com/firstlast",
        address: "City, State",
      },
      summary:
        "Detail-oriented engineer with experience delivering production features, improving reliability, and collaborating across teams. Strong communication and problem-solving skills.",
      education: [
        {
          institution: "University Name",
          degree: "Bachelor of Science",
          fieldOfStudy: "Computer Science",
          startDate: "2019-08",
          endDate: "2023-05",
          details: ["Relevant coursework: DS&A, Databases, Operating Systems"],
        },
      ],
      experience: [
        {
          jobTitle: "Software Engineer",
          company: "Company Name",
          location: "City, State",
          startDate: "2023-01",
          endDate: "Present",
          responsibilities: [
            "Built and shipped customer-facing features using React + TypeScript.",
            "Partnered with product/design to refine requirements and reduce rework.",
            "Improved build and release automation to speed up delivery.",
          ],
        },
      ],
      skills: [
        { category: "Languages", items: ["TypeScript", "JavaScript", "Python"] },
        { category: "Frameworks", items: ["React", "Node.js"] },
        { category: "Tools", items: ["Git", "Docker"] },
      ],
      projects: [
        {
          name: "Project Name",
          description: "A clean project entry to showcase impact and technologies.",
          technologies: ["React", "Node.js"],
        },
      ],
      targetJobRole: "Software Engineer",
      targetJobDescription: "Roles focused on modern web apps and product engineering.",
    },
  },
];

export function getResumeTemplateById(id: string): ResumeTemplate | undefined {
  return resumeTemplates.find((t) => t.id === id);
}

