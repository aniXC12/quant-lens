export type MemberSocialLinks = {
  instagram?: string;
  linkedin?: string;
  x?: string;
  tiktok?: string;
};

export type MemberShowcaseLink = {
  label: string;
  href: string;
};

export type MemberProject = {
  name: string;
  summary: string;
  href?: string;
};

export type MemberSection = {
  title: string;
  body: string;
};

export type MemberProfile = {
  headline: string;
  majorYear: string;
  location: string;
  builderType: string;
  interests: string[];
  tools: string[];
  projects: MemberProject[];
  repoDemoLinks: MemberShowcaseLink[];
  about: string;
  customSections: MemberSection[];
};

export type Member = {
  id: string;
  name: string;
  university?: string;
  website?: string;
  avatar?: string;
  links: MemberSocialLinks;
  profile: MemberProfile;
};

type RawMember = Omit<Member, "links" | "profile"> & {
  links: MemberSocialLinks;
  profile?: Partial<MemberProfile>;
};

function normalizeUrl(value?: string, baseUrl?: string) {
  if (!value) {
    return undefined;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  if (/^www\./i.test(trimmedValue)) {
    return `https://${trimmedValue}`;
  }

  if (!baseUrl) {
    return trimmedValue;
  }

  const normalizedHandle = trimmedValue.replace(/^@/, "");

  return `${baseUrl}${normalizedHandle}/`;
}

function normalizeText(value?: string) {
  return value?.trim() || undefined;
}

function normalizeStringList(values: string[] | undefined, fallback: string[]) {
  const normalizedValues = values?.map((value) => value.trim()).filter(Boolean) ?? [];

  return normalizedValues.length > 0 ? normalizedValues : fallback;
}

function normalizeProjects(
  projects: MemberProject[] | undefined,
  fallback: MemberProject[],
) {
  const normalizedProjects: MemberProject[] = [];

  for (const project of projects ?? []) {
    const name = project.name.trim();
    const summary = project.summary.trim();
    const href = normalizeUrl(project.href);

    if (!name || !summary) {
      continue;
    }

    normalizedProjects.push(
      href
        ? {
            name,
            summary,
            href,
          }
        : {
            name,
            summary,
          },
    );
  }

  return normalizedProjects.length > 0 ? normalizedProjects : fallback;
}

function normalizeShowcaseLinks(
  links: MemberShowcaseLink[] | undefined,
  fallback: MemberShowcaseLink[],
) {
  const normalizedLinks =
    links
      ?.map((link) => {
        const label = link.label.trim();
        const href = normalizeUrl(link.href);

        if (!label || !href) {
          return null;
        }

        return {
          label,
          href,
        };
      })
      .filter((link): link is MemberShowcaseLink => link !== null) ?? [];

  return normalizedLinks.length > 0 ? normalizedLinks : fallback;
}

function normalizeSections(
  sections: MemberSection[] | undefined,
  fallback: MemberSection[],
) {
  if (sections && sections.length === 0) {
    return [];
  }

  const normalizedSections =
    sections
      ?.map((section) => {
        const title = section.title.trim();
        const body = section.body.trim();

        if (!title || !body) {
          return null;
        }

        return {
          title,
          body,
        };
      })
      .filter((section): section is MemberSection => section !== null) ?? [];

  return normalizedSections.length > 0 ? normalizedSections : fallback;
}

function createStarterProfile(member: {
  name: string;
  university?: string;
  website?: string;
}): MemberProfile {
  return {
    headline: member.university
      ? `Student builder in the Codex Lab cohort at ${member.university}.`
      : "Student builder in the Codex Lab cohort.",
    majorYear: "Add your major and graduation year.",
    location: "Add your city, campus, or timezone.",
    builderType: "Student builder",
    interests: [
      "Add the topics you care about",
      "Share what problems excite you",
    ],
    tools: [
      "List the tools you use most",
      "Include Codex, APIs, and frameworks",
    ],
    projects: [
      {
        name: "Add a project or startup",
        summary:
          "Describe what you are building, why it matters, and what stage it is in.",
      },
    ],
    repoDemoLinks: member.website
      ? [
          {
            label: "Personal site",
            href: member.website,
          },
        ]
      : [],
    about: `${member.name} can use this page to introduce themselves, explain what they are building, and add anything else they want the cohort to know. Replace this starter copy with your own voice.`,
    customSections: [
      {
        title: "Add something extra",
        body: "Use custom sections for experiments, media, notes, favorite prompts, build logs, hackathon recaps, or anything else that feels like you.",
      },
    ],
  };
}

function normalizeProfile(
  member: RawMember,
  fallbackProfile: MemberProfile,
): MemberProfile {
  return {
    headline: normalizeText(member.profile?.headline) ?? fallbackProfile.headline,
    majorYear: normalizeText(member.profile?.majorYear) ?? fallbackProfile.majorYear,
    location: normalizeText(member.profile?.location) ?? fallbackProfile.location,
    builderType:
      normalizeText(member.profile?.builderType) ?? fallbackProfile.builderType,
    interests: normalizeStringList(member.profile?.interests, fallbackProfile.interests),
    tools: normalizeStringList(member.profile?.tools, fallbackProfile.tools),
    projects: normalizeProjects(member.profile?.projects, fallbackProfile.projects),
    repoDemoLinks: normalizeShowcaseLinks(
      member.profile?.repoDemoLinks,
      fallbackProfile.repoDemoLinks,
    ),
    about: normalizeText(member.profile?.about) ?? fallbackProfile.about,
    customSections: normalizeSections(
      member.profile?.customSections,
      fallbackProfile.customSections,
    ),
  };
}

function normalizeMember(member: RawMember): Member {
  const university = normalizeText(member.university);
  const website = normalizeUrl(member.website);
  const starterProfile = createStarterProfile({
    name: member.name,
    university,
    website,
  });

  return {
    ...member,
    university,
    website,
    links: {
      instagram: normalizeUrl(member.links.instagram, "https://www.instagram.com/"),
      linkedin: normalizeUrl(member.links.linkedin),
      x: normalizeUrl(member.links.x, "https://x.com/"),
      tiktok: normalizeUrl(member.links.tiktok, "https://www.tiktok.com/@"),
    },
    profile: normalizeProfile(member, starterProfile),
  };
}

const rawMembers: RawMember[] = [
  {
    id: "anishrudra",
    name: "Anish Rudra",
    university: "The University of Texas at Austin",
    website: "https://github.com/aniXC12",
    avatar: "/avatars/students/anish-rudra.jpg",
    links: {},
    profile: {
      headline:
        "UT Austin student building at the intersection of applied AI infrastructure, agents, and public-markets research.",
      majorYear: "Mechanical Engineering + Management Information Systems, 2026",
      location: "Austin, Texas",
      builderType: "Student builder focused on applied AI infra and agent systems",
      interests: [
        "Running",
        "Reading",
        "Formula 1",
        "NFL",
        "NBA",
        "College Sports",
        "Poker",
      ],
      tools: [
        "Codex",
        "Cursor",
        "Claude Code",
        "Python",
        "React",
        "Loveable",
        "Sigma",
      ],
      projects: [
        {
          name: "Rykos Capital",
          summary:
            "An AI-native hedge fund using autonomous research agents to rapidly parse filings, earnings, and web data to surface public-markets trades.",
        },
        {
          name: "Bloom Technologies",
          summary:
            "An identity and access management platform for AI agents that gives every agent a unique identity, scoped permissions across tools and data, and real-time logging so teams can securely deploy agents into production.",
        },
      ],
      repoDemoLinks: [
        {
          label: "GitHub",
          href: "https://github.com/aniXC12",
        },
      ],
      about:
        "Hi there! I'm Anish, a student at The University of Texas at Austin studying Mechanical Engineering and Management Information Systems. I like to run, watch sports, play poker, eat good food, and explore AI. Right now I'm working with Metis YC on applied AI infra and agents. In my free time I'm building Rykos Capital, an AI-native hedge fund that uses swarms of agents to compile research.",
      customSections: [
        {
          title: "What I'm working on",
          body: "I'm currently working with Metis YC on applied AI infrastructure and agents, with a focus on making agent systems more practical and production-ready.",
        },
        {
          title: "Outside of work",
          body: "Outside of building, I spend time running, keeping up with Formula 1 and every major sports league I can, playing poker, reading, and finding good food around Austin.",
        },
      ],
    },
  },
  {
    id: "jason-yi",
    name: "Jason Yi",
    university: "UC Berkeley",
    avatar: "/avatars/students/jason-yi.jpg",
    links: {
      instagram: "@jasonyi33",
      linkedin: "https://www.linkedin.com/in/jasonyi33/",
      x: "@jasonyi361",
      tiktok: "@jasonyi33",
    },
    profile: {
      headline: "Student builder in the Codex Lab cohort at UC Berkeley.",
      majorYear: "Electrical Engineering and Computer Sciences, 2029",
      location: "Berkeley, CA / Pacific Time",
      builderType: "Student builder",
      interests: ["Product", "Entrepreneurship", "Football", "Basketball", "Music", "Travel"],
      tools: ["Codex", "Next.js", "React", "Tailwind CSS", "Framer Motion", "Vitest", "Playwright"],
      projects: [
        {
          name: "VoiceReach",
          href: "https://...",
          summary: "VoiceReach is a voice-first case documentation app for homeless outreach workers. Built at the SF10x Hackathon, it lets staff speak notes into their phone, then transcribes and structures them into case reports with location and photos. Outreach workers often spend hours writing reports after shifts. VoiceReach turns that into a quick voice workflow in the field, improving data quality and coordination. The project later won the hackathon, piloted with a few NGOS, and was presented on the main stage at OpenAI DevDay 2025 alongside the San Francisco mayor.",
        },
      ],
      repoDemoLinks: [
        { label: "GitHub", href: "https://github.com/jasonyi33/voicereach" },
        { label: "LinkedIn", href: "https://www.linkedin.com/posts/jasonyi33_startup-openai-ai-activity-7381744127388033024-XUkN" },
        { label: "X", href: "https://x.com/..." },
      ],
      about: "Short personal intro.",
      customSections: [
        {
          title: "An AI use that inspired me",
          body: "One of my fellow presenters at OpenAI DevDay 2025, Patrick, built SolveSF, a tool used by thousands of SF residents to report problems and get help. I was inspired by his work and the impact it has on the community.",
        },
        {
          title: "What I want to build/learn next",
          body: "Currently excited about AI agents in the sales and commerce space. Currently working on a project to automate workflow for auto dealerships to streamline the car buying process.",
        },
      ],
    },
  },
  {
    id: "jay-khemchandani",
    name: "Jay Khemchandani",
    university: "Stanford",
    avatar: "/avatars/students/jay-khemchandani.jpg",
    links: {
      linkedin: "www.linkedin.com/in/jay-khemchandani",
      x: "jaykhem_",
    },
    profile: {
      headline:
        "Stanford student studying Computer Science (AI track) and Philosophy, with a focus on building AI systems that are practical, human-centered, and high impact.",
      majorYear: "Computer Science (AI track) + Philosophy",
      location: "Palo Alto, CA",
      builderType: "AI builder",
      interests: [
        "Applied AI",
        "Human-centered technology",
        "Assistive robotics",
        "LLM products",
        "Automation",
        "Startup building",
      ],
      tools: [
        "Python",
        "OpenAI APIs",
        "Computer vision",
        "NLP",
        "RAG systems",
        "Next.js",
      ],
      projects: [
        {
          name: "Baymax",
          summary:
            "An AI-powered assistive robot built at TreeHacks to help elderly and physically impaired users interact with their environment more independently.",
          href: "https://devpost.com/software/baymax-your-personal-healthcare-companion",
        },
        {
          name: "The Magic Table",
          summary:
            "A 2026 TreeHacks project exploring how VLMs, LLMs, and embedded systems can make everyday surfaces more accessible for people with limited mobility.",
          href: "https://devpost.com/software/the-magic-table",
        },
      ],
      repoDemoLinks: [
        {
          label: "LinkedIn",
          href: "https://www.linkedin.com/in/jay-khemchandani",
        },
        {
          label: "Devpost",
          href: "https://devpost.com/jaykhem",
        },
        {
          label: "Vulcan Systems",
          href: "https://vulcansystems.ai",
        },
      ],
      about:
        "Jay is a Stanford student in Computer Science (AI track) and Philosophy who likes building AI products at the intersection of technical ambition and real human need. His work centers on applied AI, assistive technology, and automation, with an emphasis on turning fast prototypes into tools that feel genuinely useful in the real world.",
      customSections: [
        {
          title: "What’s next",
          body: "Jay is interested in building the next generation of manufacturing and distribution technology systems. Vulcan Systems is the current direction for that work, with a focus on designing practical, high-leverage software and AI infrastructure for how real-world operations run.",
        },
      ],
    },
  },
  {
    id: "jake-grigorian",
    name: "Jake Grigorian",
    university: "USC",
    avatar: "/avatars/students/jake-grigorian.jpg",
    links: {
      instagram: "@jake.grigorian",
      linkedin: "https://linkedin.com/in/jakegrigorian",
    },
  },
  {
    id: "dylan-li",
    name: "Dylan Li",
    university: "University of Michigan",
    website: "https://www.lidylan.dev",
    avatar: "/avatars/students/dylan-li.jpg",
    links: {
      linkedin: "https://www.linkedin.com/in/lidylan/",
    },
    profile: {
      headline:
        "Computer Science and Engineering Physics student at the University of Michigan building AI products, developer tools, and research-driven side projects.",
      majorYear: "B.S.E. in Computer Science and Engineering Physics",
      location: "Ann Arbor, Michigan",
      builderType: "Student builder focused on AI products, dev tools, and research",
      interests: [
        "AI products",
        "Developer tools",
        "Startups",
        "Physics",
        "Problem-solving",
      ],
      tools: [
        "Next.js",
        "React",
        "TypeScript",
        "Python",
        "FastAPI",
        "LangGraph",
      ],
      projects: [
        {
          name: "GlitterCode",
          summary:
            "An AI tutor for block coding education that explains code, walks students through step-by-step tutorials, and can make small edits itself.",
        },
        {
          name: "Grok Lens",
          summary:
            "A research and learning notebook that turns Grokipedia pages into an interactive AI study partner inspired by NotebookLM.",
          href: "https://devpost.com/software/grok-lens?ref_content=my-projects-tab&ref_feature=my_projects",
        },
        {
          name: "clAI",
          summary:
            "A natural-language command line assistant that translates prompts into shell commands and won the MHacks 2025 Google Gemini Track.",
          href: "https://github.com/cryplo/mhacks25",
        },
        {
          name: "V1 Michigan Shipmas",
          summary:
            "A 12-project sprint built over 12 days for the V1 Michigan Shipmas challenge, with each build shaped by the prompt of the day.",
          href: "https://shipmas-gallery.vercel.app",
        },
      ],
      repoDemoLinks: [
        {
          label: "Personal site",
          href: "https://www.lidylan.dev",
        },
        {
          label: "GitHub",
          href: "https://github.com/Cryplo",
        },
        {
          label: "Resume",
          href: "https://www.lidylan.dev/resume.pdf",
        },
        {
          label: "Shipmas gallery",
          href: "https://shipmas-gallery.vercel.app",
        },
      ],
      about:
        "I'm Dylan, a University of Michigan student who likes building AI tools, exploring startups and physics, and turning ideas into side projects. Lately I've been bouncing between product studio, research, and hackathon builds while writing about the journey on my blog.",
      customSections: [
        {
          title: "What I'm doing now",
          body: "I'm part of the V1 Michigan W26 Product Studio cohort and the Future of Programming Lab, where I'm researching Vim-style keybinds and action macros in the Hazel editor.",
        },
        {
          title: "Outside of coding",
          body: "When I'm not building, I'm usually at the gym, out on a run with friends, trying good food, or seeing how high I can push my MonkeyType score.",
        },
        {
          title: "Writing",
          body: "I blog about the ride too, including MHacks 2025, xAI Tech Day 2025 in NYC, and xAI Hackathon 2025 in the Bay.",
        },
      ],
    },
  },
  {
    id: "ben-antonow",
    name: "Ben Antonow",
    university: "University of Michigan 〽️",
    website: "https://anto.now",
    avatar: "/avatars/students/ben-antonow.jpg",
    links: {
      linkedin: "https://www.linkedin.com/in/benantonow",
      x: "https://x.com/benantonow",
    },
    profile: {
      headline:
        "University of Michigan CS student building across AI, health tech, and interface-heavy products.",
      majorYear: "Computer Science, Senior",
      location: "Ann Arbor, MI / Palo Alto, CA",
      builderType: "Curious mind 🧠 in a curious world 🌎",
      interests: [
        "Image and diagram generation",
        "Health tech",
        "Wearables",
        "Digital detoxing",
        "Philosophy",
        "Yoga",
        "Dancing",
        "Live music",
      ],
      tools: [
        "Python",
        "C/C++",
        "JavaScript",
        "Go",
        "React",
        "Next.js",
        "AWS",
        "PostgreSQL",
      ],
      projects: [
        {
          name: "Oreen",
          summary:
            "An AI diagram generation tool for teaching and learning, built to make visual explanation easier and faster.",
        },
        {
          name: "Silent Meditation",
          summary:
            "A silent vinyl record project that beat its Kickstarter goal by 1000% and sold hundreds of copies.",
        },
      ],
      repoDemoLinks: [
        {
          label: "Personal site",
          href: "https://anto.now",
        },
        {
          label: "GitHub",
          href: "https://github.com/bantonow",
        },
        {
          label: "LinkedIn",
          href: "https://www.linkedin.com/in/benantonow",
        },
      ],
      about:
        "I'm Ben, a student, teacher, and builder at the University of Michigan. I love learning, meeting interesting people, and doing hard things!",
      customSections: [
        {
          title: "Status",
          body: "🟢 Being nerd-sniped by Codex",
        },
      ],
    },
  },
  {
    id: "mark-music",
    name: "Mark Music",
    university: "Stanford",
    avatar: "/avatars/students/mark-music.jpg",
    links: {
      instagram: "https://www.instagram.com/markmusic2727/",
      linkedin: "https://www.linkedin.com/in/markmusic27/",
      x: "https://x.com/markmusic27",
    },
  },
  {
    id: "james-masson",
    name: "James Masson",
    university: "Yale",
    avatar: "/avatars/students/james-masson.jpg",
    links: {
      instagram: "@jameswmasson",
      linkedin: "https://www.linkedin.com/in/james-masson-94a390257/",
    },
    profile: {
      headline:
        "Sophomore at Yale studying Computer Science and Mathematics, focused on secure local-first ML integrations.",
      majorYear: "Computer Science and Mathematics, Sophomore",
      location: "New York City",
      builderType: "Secure local-first AI builder",
      interests: [
        "Machine learning model integration",
        "Secure, locally stored data systems",
        "AI workflow automation for small businesses",
        "Optical communication security",
      ],
      tools: [
        "Machine learning models",
        "Local-first data architectures",
        "AI workflow automation",
        "Optical communication analysis",
      ],
      projects: [
        {
          name: "Aiku",
          summary:
            "Startup focused on integrating AI into small owner-operated business workflows.",
        },
        {
          name: "NADE",
          summary:
            "Software to detect perturbations and potential attacks on satellite beams using optical communication.",
        },
      ],
      about:
        "I am James Masson, a sophomore at Yale studying Computer Science and Mathematics. I'm from New York City, and I'm very passionate about integrating machine learning models for secure, locally stored data. Currently, I'm working on Aiku, a startup focused on integrating AI into small owner-operated business workflows, as well as NADE - software to detect perturbations and potential attacks on satellite beams using optical communication.",
      customSections: [
        {
          title: "Current Focus",
          body:
            "Building secure and practical AI systems for real-world environments, from small business workflows to resilient communications infrastructure.",
        },
      ],
    },
  },
  {
    id: "joseph-jojoe",
    name: "Joseph Jojoe",
    university: "Columbia",
    website: "https://www.josephjojoe.com/",
    avatar: "/avatars/students/joseph-jojoe.jpg",
    links: {
      instagram: "https://www.instagram.com/josephjojoe_/",
      linkedin: "https://www.linkedin.com/in/josephjojoe/",
      x: "https://x.com/josephjojoe",
    },
    profile: {
      majorYear: "CS major, graduating 2027",
      location: "New York, NY",
      builderType: "Chronic idea guy",
      interests: [
        "Philanthropy",
        "Social impact",
        "Interpretability",
        "Data science",
        "People mapping",
        "Venture capital",
        "Startups",
        "Fun hacks",
        "Music production",
      ],
      tools: [
        "Cursor",
        "Codex",
        "Claude Code",
        "Linear",
        "AWS",
        "Supabase",
        "Next.js / Vercel",
        "SF Compute",
      ],
      projects: [
        {
          name: "Conviction",
          summary: "Building internal tools for people and investment research",
        },
        {
          name: "Tool Use Axis Research",
          summary:
            "Extending Anthropic's assistant axis paper to show that there is a tool use axis in activation space which can be steered to make models more or less likely to call specific tools",
        },
      ],
      repoDemoLinks: [
        {
          label: "My personal website!",
          href: "https://www.josephjojoe.com/",
        },
      ],
      about:
        "Hey! I'm a junior at Columbia studying CS and Math. I like ML research, exploring startups and the venture ecosystem, and sidequesting.",
      customSections: [],
    },
  },
  {
    id: "soham-kolhe",
    name: "Soham Kolhe",
    university: "University of Wisconsin-Madison",
    website: "https://soham-kolhe-portfolio.vercel.app/",
    avatar: "/avatars/students/soham-kolhe.jpg",
    links: {
      instagram: "soham.kolhe7",
      linkedin: "https://www.linkedin.com/in/soham-kolhe/",
    },
    profile: {
      headline:
        "Freshman at UW-Madison studying Computer Science. Currently researching crop detection AI for the USDA using satellite imagery and deep learning.",
      majorYear: "Computer Science, Class of 2028",
      location: "Madison, WI",
      builderType: "Student builder exploring AI products and applied research",
      interests: [
        "Applied machine learning",
        "Satellite remote sensing and precision agriculture",
        "On-device AI and edge inference",
        "Privacy-first product design",
      ],
      tools: [
        "Python",
        "PyTorch",
        "Next.js",
        "React",
      ],
      projects: [
        {
          name: "arcflow",
          summary:
            "A no-code, entirely local AI pipeline builder that lets you drag, drop, and deploy privacy-first sensor workflows directly on your Snapdragon NPU.",
          href: "https://github.com/aditya-harsh11/MadData-26",
        },
        {
          name: "Portfolio Website",
          summary:
            "A creative personal portfolio site built with Next.js and modern web animations to showcase projects and writing.",
          href: "https://github.com/soham74/Portfolio-Website-Creative",
        },
      ],
      repoDemoLinks: [
        {
          label: "Personal site",
          href: "https://soham-kolhe-portfolio.vercel.app/",
        },
        {
          label: "arcflow repo",
          href: "https://github.com/aditya-harsh11/MadData-26",
        },
      ],
      about:
        "I'm Soham, a freshman at UW-Madison studying CS. Right now I'm working with the USDA on crop detection models using satellite imagery and deep learning. I like building things that run locally and solve problems people actually have. When I'm not coding, I'm probably exploring Madison or tinkering with a side project.",
      customSections: [
        {
          title: "Current research",
          body:
            "Building crop detection models from satellite imagery for the USDA, and an AI grant-writing assistant for the UW-Madison Department of Surgery that helps physician-researchers draft proposals and auto-fill regulatory forms.",
        },
        {
          title: "What I want to build next",
          body:
            "More AI tools that save experts real time on tedious work. Less busywork, more building.",
        },
      ],
    },
  },
  {
    id: "ryan-fernandes",
    name: "Ryan Fernandes",
    university: "Yale",
    website: "https://www.ryanfernanpage.com/home",
    avatar: "/avatars/students/ryan-fernandes.jpg",
    links: {
      instagram: "@ryanmartie",
      linkedin: "https://www.linkedin.com/in/ryan-fernandes-088109284/",
    },
    profile: {
      headline:
        "EECS student at Yale University from Natick, Massachusetts who loves building products, leading teams, and learning fast.",
      majorYear: "Electrical Engineering and Computer Science, Class of 2028",
      location: "New Haven, Connecticut",
      builderType: "Methodical, learning-oriented full-stack builder and technical team lead",
      interests: [
        "Building products that help students connect and collaborate",
        "Learning new technologies through ambitious side projects",
        "Designing polished user experiences for technical tools",
        "Team-based building and mentorship",
      ],
      tools: [
        "TypeScript",
        "React",
        "Next.js",
        "Python",
        "JavaScript",
        "MongoDB",
        "Firebase",
        "Git",
        "Tailwind CSS",
        "Figma",
      ],
      projects: [
        {
          name: "y/labs",
          summary:
            "Led the overhaul of Yale's research connection platform into y/labs, helping grow usage from a handful of weekly users to more than 1,000 new users in the first two weeks after launch.",
          href: "https://yalelabs.io",
        },
        {
          name: "Yale Computer Society",
          summary:
            "Serves as Co-President of Yale's premier tech organization, supporting 70+ student developers, live campus products, and new opportunities for members.",
          href: "https://yalecomputersociety.org/",
        },
        {
          name: "Document conversion pipeline",
          summary:
            "Building a UI-based document conversion workflow during a Red Hat internship to make document-to-Markdown and JSON processing easier for RAG and fine-tuning workflows.",
          href: "https://docling-document-ingestion.netlify.app/feedback-implementation",
        },
        {
          name: "Mario Kart Yale",
          summary:
            "Co-building a live competitive Mario Kart experience for Yale students with ID scan-in, realtime stats, and streaming-oriented infrastructure.",
          href: "https://github.com/MarioKartYale",
        },
      ],
      repoDemoLinks: [
        {
          label: "Personal site",
          href: "https://www.ryanfernanpage.com/home",
        },
        {
          label: "Resume",
          href: "https://www.ryanfernanpage.com/resume.pdf",
        },
        {
          label: "GitHub",
          href: "https://github.com/Ryfernandes",
        },
        {
          label: "Yale Computer Society",
          href: "https://yalecomputersociety.org/",
        },
      ],
      about:
        "Ryan is an EECS student at Yale University who got his start founding a Scratch Club in fifth grade and still approaches projects with the same energy for learning, iteration, and collaboration. He now leads the Yale Computer Society, a community of student developers building projects for Yale's campus, and enjoys taking on ambitious technical work that turns rough ideas into polished, useful products.",
      customSections: [
        {
          title: "Beyond building",
          body:
            "Outside of tech, Ryan loves singing, baking French macarons, playing Spikeball, and following the Buffalo Bills. He is highly competitive, team-oriented, and always up for a game as long as there is a little fun and friendly trash talk involved.",
        },
      ],
    },
  },
  {
    id: "jinao-wang",
    name: "Jinao Wang",
    university: "Duke",
    avatar: "/avatars/students/jinao-wang.jpg",
    links: {
      linkedin: "https://www.linkedin.com/in/michael-wang-a04b12355/",
      x: "https://x.com/Will_lin331",
    },
  },
  {
    id: "alex-jorns",
    name: "Alex Jorns",
    avatar: "/avatars/students/alex-jorns.jpg",
    links: {
      instagram: "akjo06",
      linkedin: "https://www.linkedin.com/in/alex-k-jorns",
    },
  },
  {
    id: "abdulrahman-sadiq",
    name: "Abdulrahman Sadiq",
    avatar: "/avatars/students/abdulrahman-sadiq.jpg",
    links: {
      instagram: "abdul_kvng",
      linkedin: "https://www.linkedin.com/in/abdulrahman-sadiq/",
      x: "https://x.com/Kvnggg101",
    },
  },
  {
    id: "anish-rudra",
    name: "Anish Rudra",
    avatar: "/avatars/students/anish-rudra.jpg",
    links: {
      instagram: "anish_rudra",
      linkedin: "https://www.linkedin.com/in/anish-rudra",
      x: "rudra_anish",
    },
  },
  {
    id: "avital-mintz",
    name: "Avital Mintz",
    university: "University of Chicago",
    avatar: "/avatars/students/avital-mintz.jpg",
    links: {
      linkedin: "https://www.linkedin.com/in/avitalmintz/",
    },
  },
  {
    id: "gautam-soni",
    name: "Gautam Soni",
    avatar: "/avatars/students/gautam-soni.jpg",
    links: {
      linkedin: "https://www.linkedin.com/in/gsoni16",
    },
  },
  {
    id: "joshua-liu",
    name: "Joshua Liu",
    university: "MIT",
    avatar: "/avatars/students/joshua-liu.jpg",
    links: {
      linkedin: "https://www.linkedin.com/in/joshcliu/",
    },
  },
  {
    id: "nicholas-chua",
    name: "Nicholas Chua",
    university: "UC Berkeley",
    avatar: "/avatars/students/nicholas-chua.jpg",
    links: {
      instagram: "nicholaschuas",
      linkedin: "https://www.linkedin.com/in/nicholasychua/",
      x: "nicholasychua",
    },
  },
  {
    id: "rohan-adwankar",
    name: "Rohan Adwankar",
    avatar: "/avatars/students/rohan-adwankar.jpg",
    links: {
      instagram: "rohan.adwankar",
      linkedin: "linkedin.com/in/rohanadwankar/",
      x: "rohanadwankar",
    },
  },
  {
    id: "ryan-amiri",
    name: "Ryan Amiri",
    avatar: "/avatars/students/ryan-amiri.jpg",
    links: {
      linkedin: "https://www.linkedin.com/in/ryanamiri/",
      x: "https://x.com/RyanAmiri__",
    },
  },
  {
    id: "samuel-zhang",
    name: "Samuel Zhang",
    avatar: "/avatars/students/samuel-zhang.jpg",
    links: {
      instagram: "https://www.instagram.com/samuel.z12/",
      linkedin: "https://www.linkedin.com/in/samuelz12/",
      x: "https://x.com/samuelxzhang",
    },
  },
  {
    id: "simon-ilincev",
    name: "Simon Ilincev",
    university: "Cornell",
    avatar: "/avatars/students/simon-ilincev.jpg",
    links: {
      linkedin: "https://linkedin.com/in/simon-ilincev",
      x: "https://x.com/simon_ilincev",
    },
  },
];

export const members = rawMembers.map(normalizeMember);

export const memberIds = members.map((member) => member.id);

export function getMemberById(memberId: string) {
  return members.find((member) => member.id === memberId);
}
