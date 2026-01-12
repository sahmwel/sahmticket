'use client';

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Target, Globe, Headphones, Flame, Music, Mic2, PartyPopper, Star,
  ArrowRight, Crown, Calendar, Ticket, Users, TrendingUp, Shield,
  Zap, Clock, Award, Briefcase, DollarSign, FileText, Palette,
  BarChart, Megaphone, Settings, Heart, Sparkles, Rocket, TrendingUp as Growth,
  Award as Investor, Lightbulb, Code, GitBranch, Smartphone, Cloud,
  CheckCircle, Users as Community, BarChart3, Zap as Speed,
  Mail, Phone, MapPin, CheckCircle2, Eye, BarChart4, Camera
} from "lucide-react";

// Define the team member type
type TeamMember = {
  name: string;
  role: string;
  bio?: string;
  icon: any;
  color: string;
  funFact?: string;
  contact?: string;
  image?: string;
};

// Complete Team - Ready to Execute
const teamMembers: TeamMember[] = [
  {
    name: "Samuel Obute",
    role: "Founder & CEO",
    bio: "Full-stack developer who built the platform from scratch. Leads product vision and engineering.",
    // image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&h=200&fit=crop&crop=face",
    icon: Code,
    color: "from-purple-500 to-pink-600",
    funFact: "Built platform in 8 weeks",
    // contact: "samuel@sahmtickethub.com"
  },
  {
    name: "Project Manager",
    role: "Head of Operations",
    bio: "Ensures flawless event execution and team coordination. Manages promoter onboarding and support.",
    // image: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?q=80&w=200&h=200&fit=crop&crop=face",
    icon: Settings,
    color: "from-blue-500 to-cyan-600",
    // funFact: "5+ years event management",
    // contact: "ops@sahmtickethub.com"
  },
  {
    name: "Social Media Team",
    role: "Digital Marketing",
    bio: "Creates buzz and drives ticket sales through targeted campaigns and social media strategy.",
    // image: "https://images.unsplash.com/photo-1551836026-d5c2c5af78e4?q=80&w=200&h=200&fit=crop&crop=face",
    icon: Megaphone,
    color: "from-orange-500 to-red-600",
    // funFact: "Expert in event promotion",
    // contact: "marketing@sahmtickethub.com"
  },
    {
    name: "Social Media Team",
    role: "Digital Marketing",
    bio: "Creates buzz and drives ticket sales through targeted campaigns and social media strategy.",
    // image: "https://images.unsplash.com/photo-1551836026-d5c2c5af78e4?q=80&w=200&h=200&fit=crop&crop=face",
    icon: Megaphone,
    color: "from-orange-500 to-red-600",
    // funFact: "Expert in event promotion",
    // contact: "marketing@sahmtickethub.com"
  },
  {
    name: "Accountant",
    role: "Finance & Payouts",
    bio: "Manages all transactions and ensures 24-hour payouts. Handles financial compliance.",
    // image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=200&h=200&fit=crop&crop=face",
    icon: DollarSign,
    color: "from-green-500 to-emerald-600",
    // funFact: "Fast payout processing",
    // contact: "finance@sahmtickethub.com"
  },
  {
    name: "UI/UX Team",
    role: "Product Design",
    // bio: "Creates beautiful, intuitive interfaces that make ticket selling and buying seamless.",
    // image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&h=200&fit=crop&crop=face",
    icon: Palette,
    color: "from-pink-500 to-rose-600",
    // funFact: "User-focused design",
    // contact: "design@sahmtickethub.com"
  },
  {
  name: "Media Team",
  role: "Photography & Video",
  bio: "Professional media coverage for events. Captures content for marketing and memories.",
  // image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=200&h=200&fit=crop&crop=face",
  icon: Camera, // You'll need to import Camera from lucide-react
  color: "from-violet-500 to-purple-600",
  funFact: "Covered 500+ events",
  // contact: "media@sahmtickethub.com"
},
  {
    name: "Support Team",
    role: "24/7 Customer Support",
    bio: "Dedicated team ready to help promoters succeed with their events.",
    // image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=200&h=200&fit=crop&crop=face",
    icon: CheckCircle,
    color: "from-indigo-500 to-blue-600",
    funFact: "Always available",
    // contact: "support@sahmtickethub.com"
  }
];

// Platform Stats
const platformStats = [
  { value: "2026", label: "Launched", icon: Calendar, color: "text-purple-600", growth: "Ready now" },
  { value: "0%", label: "Commission", icon: DollarSign, color: "text-green-600", growth: "Free to start" },
  { value: "24hrs", label: "Payout Speed", icon: Clock, color: "text-blue-600", growth: "Guaranteed" },
  { value: "30%", label: "Avg Sales Increase", icon: TrendingUp, color: "text-amber-600", growth: "For new organizers" },
  { value: "100%", label: "Fraud Protection", icon: Shield, color: "text-emerald-600", growth: "Verified QR" },
  { value: "7", label: "Team Members", icon: Users, color: "text-pink-600", growth: "Full team" },
];

// Platform Features
const platformFeatures = [
  {
    icon: Shield,
    title: "Kill Fake Tickets",
    description: "Blockchain-verified QR system eliminates ticket fraud completely",
    color: "bg-emerald-500",
    metric: "100% protection"
  },
  {
    icon: Zap,
    title: "Instant Payouts",
    description: "Get paid in 24 hours vs 30-day industry standard",
    color: "bg-amber-500",
    metric: "Fast cash flow"
  },
  {
    icon: BarChart3,
    title: "Live Analytics",
    description: "Real-time dashboard showing sales, attendance, and revenue",
    color: "bg-blue-500",
    metric: "Data-driven decisions"
  },
  {
    icon: Cloud,
    title: "Scale Instantly",
    description: "Handle thousands of concurrent sales without breaking",
    color: "bg-purple-500",
    metric: "99.9% uptime"
  }
];

// Success Stories (Placeholder for future)
const successStories = [
  {
    year: "2026 Q1",
    milestone: "Platform Launch",
    detail: "Full team assembled in Kaduna, ready to serve promoters",
    icon: Rocket,
    color: "from-purple-500 to-pink-500"
  },
  {
    year: "2026 Q2",
    milestone: "First 100 Events",
    detail: "Target: Power 100 successful events across Nigeria",
    icon: Target,
    color: "from-blue-500 to-cyan-500"
  },
  {
    year: "2026 Q3",
    milestone: "National Expansion",
    detail: "Expand to Lagos, Abuja, and other major cities",
    icon: Globe,
    color: "from-green-500 to-emerald-500"
  },
  {
    year: "2026 Q4",
    milestone: "10,000+ Tickets",
    detail: "Goal: Process 10,000+ tickets for Nigerian events",
    icon: Ticket,
    color: "from-orange-500 to-red-500"
  },
];

const eventTypes = [
  { icon: Mic2, label: "Concerts", color: "from-purple-500 to-violet-600", count: "Perfect for" },
  { icon: PartyPopper, label: "Raves & Parties", color: "from-pink-500 to-rose-600", count: "Ideal platform" },
  { icon: Music, label: "Festivals", color: "from-amber-500 to-orange-600", count: "Scale with" },
  { icon: Headphones, label: "Afrobeats Nights", color: "from-blue-500 to-cyan-600", count: "Built for" },
  { icon: Flame, label: "Comedy Shows", color: "from-red-500 to-orange-600", count: "Easy to use" },
  { icon: Star, label: "VIP Experiences", color: "from-yellow-500 to-amber-600", count: "Premium features" },
  { icon: Award, label: "Album Launches", color: "from-emerald-500 to-teal-600", count: "Perfect timing" },
  { icon: Globe, label: "Tour Stops", color: "from-indigo-500 to-purple-600", count: "Tour ready" },
] as const;

export default function About() {
  const navigate = useNavigate();

  return (
    <>
      {/* HERO SECTION - Ready to Sell Out */}
      <section className="pt-16 sm:pt-20 lg:pt-28 min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1 }}
            className="space-y-8"
          >
            {/* Badge */}
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white px-6 py-3 rounded-full text-sm font-bold mb-4"
            >
              <CheckCircle2 className="w-4 h-4" />
              Ready to Sell Out • Full Team • 2026 Launch
            </motion.div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black">
              Ready to Sell Out Your Event?
            </h1>

            <div className="relative">
              <p className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500">
                SahmTicketHub
              </p>
              <p className="text-sm sm:text-lg text-gray-300 mt-4">
                Join thousands of promoters who trust SahmTicketHub
              </p>
            </div>

            {/* Hero CTAs */}
            <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate("/teaser")}
                className="group inline-flex items-center justify-center gap-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold text-lg px-8 py-4 rounded-full hover:scale-105 transition-all shadow-2xl"
              >
                Create Your First Event
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition" />
              </button>
              <button
                onClick={() => navigate("/events")}
                className="inline-flex items-center justify-center bg-transparent text-white border-2 border-white font-bold text-lg px-8 py-4 rounded-full hover:bg-white/10 transition-all"
              >
                <Eye className="w-5 h-5 mr-2" />
                Browse Events
              </button>
            </div>

            {/* Value Props */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Free to Start</h3>
                <p className="text-gray-300 text-sm">No setup fees. Only pay when you sell tickets.</p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">24/7 Support</h3>
                <p className="text-gray-300 text-sm">Dedicated support team ready to help you succeed.</p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Proven Results</h3>
                <p className="text-gray-300 text-sm">Average 30% increase in ticket sales for new organizers.</p>
              </div>
            </div>

            {/* Platform Stats */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {platformStats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
                  >
                    <Icon className="w-8 h-8 mx-auto mb-3 text-white/80" />
                    <p className={`text-3xl font-black ${stat.color}`}>
                      {stat.value}
                    </p>
                    <p className="text-sm font-semibold text-gray-300 mt-2">
                      {stat.label}
                    </p>
                    <p className="text-xs text-green-400 mt-1">
                      {stat.growth}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* TEAM SECTION - Complete Team */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              Your Complete Event Success Team
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Every expert you need to sell out your event is already on our team.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-6 py-3 rounded-full font-bold">
              <CheckCircle className="w-5 h-5" />
              Full Team • Ready to Execute
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member, i) => {
              const Icon = member.icon;
              const hasImage = member.image && member.image.includes("unsplash.com");
              
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-shadow overflow-hidden border border-gray-100 h-full">
                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-100 to-white">
                      <div className={`absolute inset-0 bg-gradient-to-br ${member.color} opacity-5`} />
                      
                      {/* Team avatar */}
                      <div className="flex items-center justify-center h-full">
                        <div className="relative">
                          {hasImage ? (
                            <img
                              src={member.image}
                              alt={member.name}
                              className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                            />
                          ) : (
                            <div className={`bg-gradient-to-r ${member.color} w-32 h-32 rounded-full flex items-center justify-center`}>
                              <Icon className="w-16 h-16 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <div className={`bg-gradient-to-r ${member.color} p-2 rounded-lg`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900">{member.name}</h3>
                          <p className="text-sm text-purple-600 font-semibold">{member.role}</p>
                        </div>
                      </div>
                      
                      {member.bio && (
                        <p className="text-sm text-gray-600 mb-4 leading-relaxed">{member.bio}</p>
                      )}
                      
                      {member.contact && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 mb-2">Contact:</p>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <a 
                              href={`mailto:${member.contact}`}
                              className="text-sm text-purple-600 hover:text-purple-800 font-medium truncate"
                            >
                              {member.contact}
                            </a>
                          </div>
                        </div>
                      )}
                      
                      {member.funFact && (
                        <div className="mt-4">
                          <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
                            {member.funFact}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Team Benefits */}
          <div className="mt-20 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-8">Why Our Complete Team Matters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-8"
              >
                <Settings className="w-12 h-12 mx-auto mb-4 text-purple-600" />
                <p className="text-xl font-bold text-gray-900 mb-2">Smooth Execution</p>
                <p className="text-gray-600">Project management ensures every detail is handled</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-8"
              >
                <Megaphone className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                <p className="text-xl font-bold text-gray-900 mb-2">Marketing Power</p>
                <p className="text-gray-600">Social team creates buzz and drives ticket sales</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-8"
              >
                <DollarSign className="w-12 h-12 mx-auto mb-4 text-emerald-600" />
                <p className="text-xl font-bold text-gray-900 mb-2">Financial Security</p>
                <p className="text-gray-600">Accountant ensures fast, accurate payouts</p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* PLATFORM FEATURES */}
      <section className="py-20 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              Everything You Need to Sell Out
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto">
              Our complete platform handles every aspect of your event
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {platformFeatures.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
                >
                  <div className={`${feature.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-6`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 mb-4">{feature.description}</p>
                  <div className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full font-medium">
                    {feature.metric}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Dashboard Preview */}
          <div className="mt-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-8 text-white">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-3xl font-bold mb-6">Organizer Dashboard</h3>
                <ul className="space-y-4 mb-8">
                  {[
                    "Real-time sales tracking",
                    "Audience demographics",
                    "Revenue analytics",
                    "Ticket scanning reports",
                    "Email marketing tools",
                    "Social media integration"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate("/teaser")}
                  className="inline-flex items-center gap-3 bg-white text-purple-600 font-bold px-8 py-3 rounded-full hover:scale-105 transition-all"
                >
                  <BarChart4 className="w-5 h-5" />
                  See Organizer Dashboard 
                </button>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Tickets Sold</span>
                    <span className="text-2xl font-bold">1,247</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Revenue</span>
                    <span className="text-2xl font-bold">₦4,985,000</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Conversion Rate</span>
                    <span className="text-2xl font-bold">42%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Time to Payout</span>
                    <span className="text-2xl font-bold">24h</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SUCCESS ROADMAP */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              2026 Success Roadmap
            </h2>
            <p className="text-gray-600">
              Join us on our journey to transform Nigerian events
            </p>
          </div>
          
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-purple-500 to-pink-500" />
            
            <div className="space-y-12">
              {successStories.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className={`relative flex ${i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'} items-center`}
                  >
                    <div className={`w-1/2 ${i % 2 === 0 ? 'pr-12 text-right' : 'pl-12'}`}>
                      <div className={`bg-gradient-to-br ${item.color} p-6 rounded-2xl shadow-lg text-white`}>
                        <div className="flex items-center justify-end gap-3 mb-3">
                          <Icon className="w-6 h-6" />
                          <p className="text-2xl font-black">{item.year}</p>
                        </div>
                        <p className="text-xl font-bold mb-2">{item.milestone}</p>
                        <p className="opacity-90">{item.detail}</p>
                      </div>
                    </div>
                    
                    <div className="absolute left-1/2 transform -translate-x-1/2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 border-4 border-white shadow-lg" />
                    </div>
                    
                    <div className="w-1/2" />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* EVENT TYPES WE POWER */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              Power Every Type of Event
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto">
              From small gatherings to massive festivals
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {eventTypes.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-gradient-to-br ${item.color} rounded-2xl p-6 text-center text-white shadow-lg hover:shadow-xl transition-shadow`}
                >
                  <Icon className="w-10 h-10 mx-auto mb-3" />
                  <p className="font-bold text-lg">{item.label}</p>
                  <p className="text-sm opacity-90 mt-1">{item.count}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Location Badge */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 px-8 py-4 rounded-full font-bold">
              <MapPin className="w-5 h-5" />
              Built in Kaduna • Trusted by Nigeria's top promoters
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className="py-20 bg-gradient-to-r from-gray-900 to-purple-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="space-y-10"
          >
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white px-6 py-3 rounded-full font-bold">
              <Ticket className="w-5 h-5" />
              Ready to Sell Out Your Event?
            </div>
            
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black">
              Start Selling Tickets Today
            </h2>
            
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              With our complete team and platform, you have everything you need to create and sell out your next event.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button
                onClick={() => navigate("/teaser")}
                className="group inline-flex items-center justify-center gap-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold text-lg px-10 py-5 rounded-full hover:scale-105 transition-all shadow-2xl"
              >
                Start Selling Free Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition" />
              </button>
              
              <button
                onClick={() => navigate("/events")}
                className="inline-flex items-center justify-center gap-3 bg-transparent text-white border-2 border-white font-bold text-lg px-10 py-5 rounded-full hover:bg-white/10 transition-all"
              >
                <Eye className="w-5 h-5" />
                Browse Events
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
                <p className="text-3xl font-bold text-pink-400">0%</p>
                <p className="text-lg font-semibold">Commission Fee</p>
                <p className="text-sm text-gray-400">Free to start selling</p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
                <p className="text-3xl font-bold text-blue-400">24h</p>
                <p className="text-lg font-semibold">Payout Speed</p>
                <p className="text-sm text-gray-400">Fastest in Nigeria</p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
                <p className="text-3xl font-bold text-green-400">30%</p>
                <p className="text-lg font-semibold">More Sales</p>
                <p className="text-sm text-gray-400">Average increase</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}