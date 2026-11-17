import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

const CONTRIBUTION_TYPES = [
  {
    id: "MONETARY",
    label: "Monetary Contribution (Enquiry / Official Channel)",
    short: "Monetary Support",
    desc: "Pledge financial support towards child nutrition through a verified foundation's official channel.",
  },
  {
    id: "FOOD_SUPPLIES",
    label: "Donate Approved Food Supplies & Groceries",
    short: "Food & Groceries",
    desc: "Contribute quality-checked dry rations, pulses, fortified staples, or seasonal produce.",
  },
  {
    id: "SCHOOL_SPONSORSHIP",
    label: "Sponsor Nutritional Support for a School / Anganwadi",
    short: "Sponsor a Centre",
    desc: "Adopt supplementary nutrition support for a specific government school or Anganwadi centre.",
  },
  {
    id: "INITIATIVE_SUPPORT",
    label: "Support Specific Nutrition Initiatives",
    short: "Nutrition Initiatives",
    desc: "Support targeted drives such as protein/pulse supplementation, seasonal fruit, or kitchen scales.",
  },
];

export default function ThaliSharePage({ user }) {
  // Impact & Demo toggle state (Default false = Verified Live Statistics Only)
  const [includeDemo, setIncludeDemo] = useState(false);
  const [impact, setImpact] = useState(null);

  // Foundation directory state
  const [foundations, setFoundations] = useState([]);
  const [schools, setSchools] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [initiativeFilter, setInitiativeFilter] = useState("");
  const [verifiedOnlyFilter, setVerifiedOnlyFilter] = useState(true);

  // Contribution Form state
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [contributorCategory, setContributorCategory] = useState("INDIVIDUAL");
  const [selectedFoundationId, setSelectedFoundationId] = useState("");
  const [contributionType, setContributionType] = useState("MONETARY");
  const [amountInr, setAmountInr] = useState("2500");
  const [groceryCategory, setGroceryCategory] = useState("Toor Dal & Protein Pulses");
  const [groceryQtyKg, setGroceryQtyKg] = useState("25");
  const [deliveryDistrict, setDeliveryDistrict] = useState("Bengaluru Urban");
  const [targetSchoolId, setTargetSchoolId] = useState("");
  const [sponsorshipDuration, setSponsorshipDuration] = useState("1 Month Supplementary Nutrition");
  const [targetInitiative, setTargetInitiative] = useState("Protein & Pulse Supplementation");
  const [estimatedMeals, setEstimatedMeals] = useState("100");
  const [estimatedChildren, setEstimatedChildren] = useState("50");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState(null);
  const [formError, setFormError] = useState("");

  // Contribution Tracker state
  const [trackQuery, setTrackQuery] = useState("");
  const [trackedResults, setTrackedResults] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Register New Organization Modal state
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [newOrg, setNewOrg] = useState({
    name: "",
    logo_initials: "NGO",
    description: "",
    mission: "",
    registration_status: "Verified Registered Organization",
    registration_reference: "",
    areas_text: "Bengaluru Urban, Mysuru",
    initiatives_text: "Protein & Pulse Supplementation, School Meal Sponsorship",
    official_website: "",
    contact_email: "",
    contact_phone: "",
    verified: true,
    is_demo: false,
    utilization_summary: "Official utilization reports published upon contribution completion.",
  });

  const loadThaliShareData = async (demoFlag) => {
    try {
      const [impData, foundList, schoolList] = await Promise.all([
        api.getThaliShareImpact(demoFlag),
        api.getThaliShareFoundations({ include_demo: true }),
        api.getSchools().catch(() => []),
      ]);
      setImpact(impData);
      setFoundations(foundList);
      setSchools(schoolList);

      // Select first eligible verified foundation matching demo preference or any verified foundation
      const eligible = foundList.filter((f) => f.verified && (demoFlag || !f.is_demo));
      const fallbackEligible = foundList.filter((f) => f.verified);
      if (eligible.length > 0) {
        setSelectedFoundationId(String(eligible[0].id));
      } else if (fallbackEligible.length > 0 && !selectedFoundationId) {
        setSelectedFoundationId(String(fallbackEligible[0].id));
      }

      if (schoolList.length > 0 && !targetSchoolId) {
        setTargetSchoolId(String(schoolList[0].id));
      }
    } catch (err) {
      setFormError(err.message);
    }
  };

  useEffect(() => {
    loadThaliShareData(includeDemo);
  }, [includeDemo]);

  // Derived filter options from available foundations
  const allLocations = Array.from(
    new Set(foundations.flatMap((f) => f.areas_of_operation || []))
  ).sort();
  const allInitiatives = Array.from(
    new Set(foundations.flatMap((f) => f.initiatives_supported || []))
  ).sort();

  const visibleFoundations = foundations.filter((f) => {
    if (verifiedOnlyFilter && !f.verified) return false;
    if (!includeDemo && f.is_demo) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText =
        f.name.toLowerCase().includes(q) ||
        (f.description || "").toLowerCase().includes(q) ||
        (f.mission || "").toLowerCase().includes(q);
      if (!matchText) return false;
    }
    if (locationFilter && !(f.areas_of_operation || []).includes(locationFilter)) {
      return false;
    }
    if (initiativeFilter && !(f.initiatives_supported || []).includes(initiativeFilter)) {
      return false;
    }
    return true;
  });

  // Eligible recipients for the Contribution Form MUST have verified === true
  const eligibleFoundations = foundations.filter((f) => f.verified === true);
  const selectedFoundationObj = eligibleFoundations.find(
    (f) => String(f.id) === String(selectedFoundationId)
  );

  const handleSelectFoundationFromCard = (foundation) => {
    if (!foundation.verified) return;
    setSelectedFoundationId(String(foundation.id));
    const formEl = document.getElementById("thalishare-contribution-form");
    if (formEl) {
      formEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSubmitContribution = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmittedReceipt(null);

    if (!selectedFoundationId || !selectedFoundationObj) {
      setFormError(
        "Please select a verified organization. Contributions are only permitted for verified organizations."
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        full_name: fullName,
        email,
        phone,
        contributor_category: contributorCategory,
        foundation_id: Number(selectedFoundationId),
        contribution_type: contributionType,
        amount_inr: contributionType === "MONETARY" ? Number(amountInr) : null,
        supply_details:
          contributionType === "FOOD_SUPPLIES"
            ? {
                grocery_category: groceryCategory,
                quantity_kg: Number(groceryQtyKg),
                delivery_district: deliveryDistrict,
              }
            : contributionType === "SCHOOL_SPONSORSHIP"
            ? { sponsorship_duration: sponsorshipDuration }
            : null,
        school_id:
          contributionType === "SCHOOL_SPONSORSHIP" && targetSchoolId
            ? Number(targetSchoolId)
            : null,
        initiative_name:
          contributionType === "INITIATIVE_SUPPORT"
            ? targetInitiative
            : contributionType === "FOOD_SUPPLIES"
            ? "Approved Dry Ration & Grocery Support"
            : "Child Nutrition Support",
        meals_supported_est: Number(estimatedMeals) || 0,
        children_reached_est: Number(estimatedChildren) || 0,
        message: message || null,
        is_demo: Boolean(selectedFoundationObj.is_demo),
      };

      const res = await api.submitThaliShareContribution(payload);
      setSubmittedReceipt(res);
      setTrackQuery(res.tracking_ref);
      if (res.is_demo && !includeDemo) {
        setIncludeDemo(true);
      } else {
        await loadThaliShareData(includeDemo);
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackSearch = async (e) => {
    e.preventDefault();
    if (!trackQuery.trim()) return;
    setTrackingLoading(true);
    try {
      const res = await api.trackThaliShareContribution(trackQuery.trim());
      setTrackedResults(res);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleRegisterOrganization = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      const created = await api.createThaliShareFoundation({
        name: newOrg.name,
        logo_initials: newOrg.logo_initials || "NGO",
        description: newOrg.description,
        mission: newOrg.mission,
        registration_status: newOrg.verified
          ? "Verified Organization"
          : "Pending Verification",
        registration_reference: newOrg.registration_reference || null,
        areas_of_operation: newOrg.areas_text
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        initiatives_supported: newOrg.initiatives_text
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        contribution_types: [
          "MONETARY",
          "FOOD_SUPPLIES",
          "SCHOOL_SPONSORSHIP",
          "INITIATIVE_SUPPORT",
        ],
        official_website: newOrg.official_website || null,
        contact_email: newOrg.contact_email || null,
        contact_phone: newOrg.contact_phone || null,
        verified: Boolean(newOrg.verified),
        is_demo: Boolean(newOrg.is_demo),
        utilization_summary: newOrg.utilization_summary || null,
      });
      setShowOnboardModal(false);
      await loadThaliShareData(includeDemo);
      if (created?.verified) {
        setSelectedFoundationId(String(created.id));
      }
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Public / Standalone Top Bar when accessed without login */}
      {!user && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-700 font-bold text-white">
              TC
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900">
                ThaliCheck • ThaliShare
              </span>
              <p className="text-xs text-slate-500">
                Community Nutrition Contributions Portal
              </p>
            </div>
          </div>
          <Link
            to="/login"
            className="rounded-lg border border-emerald-700 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
          >
            ← Staff / Officer Sign In
          </Link>
        </div>
      )}

      {/* 1. HERO LANDING SECTION (Requirement 1) */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-6 sm:p-10 text-white shadow-md">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3.5 py-1 text-xs font-semibold text-emerald-200">
            <span>🤝 ThaliShare – Community Contributions</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Together, We Can Make Every Meal Better.
          </h1>
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
            ThaliCheck&apos;s AI monitoring helps identify potential calorie and protein gaps in meals served across government schools (PM POSHAN) and Anganwadi centres (ICDS). Through <strong>ThaliShare</strong>, individuals, students, companies, NGOs, and community groups can partner directly with registered and verified foundations to bridge nutritional shortfalls—by sponsoring supplementary protein, donating approved food supplies, supporting school meal programs, or funding targeted child nutrition initiatives.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href="#thalishare-directory"
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-500 transition"
            >
              Explore Verified Foundations
            </a>
            <a
              href="#thalishare-contribution-form"
              className="rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition"
            >
              Make a Contribution Enquiry
            </a>
            <a
              href="#thalishare-tracker"
              className="rounded-xl border border-white/20 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 transition"
            >
              Track Existing Contribution
            </a>
          </div>
        </div>
      </section>

      {/* 5. IMPACT DASHBOARD WITH HONEST LIVE vs DEMO DISTINCTION (Requirement 5) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-900">
                Community Nutrition Impact Dashboard
              </h2>
              <span
                className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                  includeDemo
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                }`}
              >
                {includeDemo
                  ? "DEMO PREVIEW DATA INCLUDED"
                  : "VERIFIED LIVE STATISTICS ONLY"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              In compliance with ThaliCheck&apos;s honesty rules, live impact counters never display invented numbers—they start at 0 and reflect only verified database records.
            </p>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100">
            <input
              type="checkbox"
              checked={includeDemo}
              onChange={(e) => setIncludeDemo(e.target.checked)}
            />
            <span>Include Demo Templates &amp; Sample Data</span>
          </label>
        </div>

        {includeDemo && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-950 font-medium">
            <strong>Demo Preview Mode Active:</strong> The metrics and `[DEMO TEMPLATE]` organizations shown below include simulated sample records (`is_demo = true`) to illustrate the workflow. Toggle off the checkbox above to view strictly verified live statistics.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="text-xs font-semibold text-slate-500">
              Total Contributions Recorded
            </div>
            <div className="mt-1 text-2xl font-extrabold text-slate-900">
              {impact?.total_contributions_count ?? 0}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              Pledged Monetary: ₹{(impact?.total_monetary_pledged_inr ?? 0).toLocaleString()}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="text-xs font-semibold text-emerald-800">
              Meals Supported
            </div>
            <div className="mt-1 text-2xl font-extrabold text-emerald-700">
              {(impact?.meals_supported ?? 0).toLocaleString()}
            </div>
            <div className="mt-0.5 text-[11px] text-emerald-700">
              Supplementary servings
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
            <div className="text-xs font-semibold text-blue-800">
              Children Reached
            </div>
            <div className="mt-1 text-2xl font-extrabold text-blue-700">
              {(impact?.children_reached ?? 0).toLocaleString()}
            </div>
            <div className="mt-0.5 text-[11px] text-blue-700">
              School &amp; Anganwadi beneficiaries
            </div>
          </div>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
            <div className="text-xs font-semibold text-indigo-800">
              Schools / Centres Supported
            </div>
            <div className="mt-1 text-2xl font-extrabold text-indigo-700">
              {impact?.schools_supported ?? 0}
            </div>
            <div className="mt-0.5 text-[11px] text-indigo-700">
              Directly sponsored centres
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="text-xs font-semibold text-slate-600">
              Active Verified Foundations
            </div>
            <div className="mt-1 text-2xl font-extrabold text-slate-900">
              {impact?.active_verified_foundations ?? 0}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              Eligible donation recipients
            </div>
          </div>
        </div>
      </section>

      {/* 3. CONTRIBUTION OPTIONS OVERVIEW (Requirement 3) */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CONTRIBUTION_TYPES.map((opt) => (
          <div
            key={opt.id}
            onClick={() => {
              setContributionType(opt.id);
              document
                .getElementById("thalishare-contribution-form")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className={`cursor-pointer rounded-2xl border p-5 transition shadow-sm ${
              contributionType === opt.id
                ? "border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600"
                : "border-slate-200 bg-white hover:border-emerald-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                {opt.short}
              </span>
              <span className="text-xs font-bold text-emerald-700">Select →</span>
            </div>
            <h3 className="mt-1.5 text-sm font-bold text-slate-900">{opt.label}</h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">{opt.desc}</p>
          </div>
        ))}
      </section>

      {/* 2. FOUNDATION DIRECTORY (Requirement 2) */}
      <section
        id="thalishare-directory"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Participating Foundations &amp; NGO Directory
            </h2>
            <p className="text-xs text-slate-500">
              Only organizations whose verification has been completed are eligible to receive community contributions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowOnboardModal(!showOnboardModal)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800"
          >
            + Onboard / Register Verified Foundation
          </button>
        </div>

        {/* Modal / Drawer to Register a Real Participating Foundation */}
        {showOnboardModal && (
          <form
            onSubmit={handleRegisterOrganization}
            className="rounded-2xl border-2 border-emerald-600 bg-emerald-50/40 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Register Participating Foundation / NGO Profile
              </h3>
              <button
                type="button"
                onClick={() => setShowOnboardModal(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                ✕ Close
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Enter genuine organization details. Do not enter fabricated registration numbers or unverified payment links.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                type="text"
                required
                placeholder="Organization Name *"
                value={newOrg.name}
                onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              />
              <input
                type="text"
                maxLength={6}
                placeholder="Logo Initials (e.g. CFN)"
                value={newOrg.logo_initials}
                onChange={(e) =>
                  setNewOrg({ ...newOrg, logo_initials: e.target.value })
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              />
              <input
                type="text"
                placeholder="Official Registration Ref (Optional)"
                value={newOrg.registration_reference}
                onChange={(e) =>
                  setNewOrg({ ...newOrg, registration_reference: e.target.value })
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              />
              <input
                type="text"
                required
                placeholder="Short Description *"
                value={newOrg.description}
                onChange={(e) =>
                  setNewOrg({ ...newOrg, description: e.target.value })
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:col-span-2"
              />
              <input
                type="text"
                required
                placeholder="Mission Statement *"
                value={newOrg.mission}
                onChange={(e) => setNewOrg({ ...newOrg, mission: e.target.value })}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              />
              <input
                type="text"
                required
                placeholder="Areas of Operation (comma-separated) *"
                value={newOrg.areas_text}
                onChange={(e) =>
                  setNewOrg({ ...newOrg, areas_text: e.target.value })
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              />
              <input
                type="text"
                required
                placeholder="Initiatives Supported (comma-separated) *"
                value={newOrg.initiatives_text}
                onChange={(e) =>
                  setNewOrg({ ...newOrg, initiatives_text: e.target.value })
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:col-span-2"
              />
              <input
                type="url"
                placeholder="Official Website URL (https://...)"
                value={newOrg.official_website}
                onChange={(e) =>
                  setNewOrg({ ...newOrg, official_website: e.target.value })
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              />
              <input
                type="email"
                placeholder="Official Contact Email"
                value={newOrg.contact_email}
                onChange={(e) =>
                  setNewOrg({ ...newOrg, contact_email: e.target.value })
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              />
              <input
                type="text"
                placeholder="Official Contact Phone"
                value={newOrg.contact_phone}
                onChange={(e) =>
                  setNewOrg({ ...newOrg, contact_phone: e.target.value })
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={newOrg.verified}
                  onChange={(e) =>
                    setNewOrg({ ...newOrg, verified: e.target.checked })
                  }
                />
                <span>Mark Verification Completed (Eligible Recipient)</span>
              </label>
              <button
                type="submit"
                className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-800"
              >
                Save Organization to Directory
              </button>
            </div>
          </form>
        )}

        {/* Directory Search & Filter Bar */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search by organization name or mission..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
          />

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
          >
            <option value="">All Locations / Districts</option>
            {allLocations.map((loc) => (
              <option key={loc} value={loc}>
                Location: {loc}
              </option>
            ))}
          </select>

          <select
            value={initiativeFilter}
            onChange={(e) => setInitiativeFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
          >
            <option value="">All Nutrition Initiatives</option>
            {allInitiatives.map((init) => (
              <option key={init} value={init}>
                Initiative: {init}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={verifiedOnlyFilter}
              onChange={(e) => setVerifiedOnlyFilter(e.target.checked)}
            />
            <span>Verified Recipients Only</span>
          </label>
        </div>

        {/* Foundation Cards */}
        {visibleFoundations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-3">
            <div className="text-sm font-bold text-slate-800">
              No verified live organizations match your current filter.
            </div>
            <p className="text-xs text-slate-600 max-w-lg mx-auto">
              Because ThaliCheck never fabricates NGO registrations, live directory entries appear only when onboarded via <strong>&ldquo;+ Onboard / Register Verified Foundation&rdquo;</strong> above, or you can enable <strong>&ldquo;Include Demo Templates &amp; Sample Data&rdquo;</strong> to preview sample profiles.
            </p>
            {!includeDemo && (
              <button
                type="button"
                onClick={() => setIncludeDemo(true)}
                className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
              >
                Enable Demo Template Preview
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visibleFoundations.map((f) => (
              <div
                key={f.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition ${
                  String(selectedFoundationId) === String(f.id)
                    ? "border-emerald-600 bg-emerald-50/30 shadow-sm"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-sm font-extrabold text-white shadow-sm">
                        {f.logo_initials || "NGO"}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          {f.name}
                        </h3>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          {f.verified ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                              ✓ Verified Recipient
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-800">
                              ⚠️ Unverified (Ineligible)
                            </span>
                          )}
                          {f.is_demo && (
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                              DEMO TEMPLATE
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    {f.description}
                  </p>
                  <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700">
                    <strong>Mission:</strong> {f.mission}
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                    <div>
                      <span className="font-semibold text-slate-500 block">
                        Verification &amp; Registration:
                      </span>
                      <span className="text-slate-800 font-medium">
                        {f.registration_status}
                        {f.registration_reference
                          ? ` (${f.registration_reference})`
                          : ""}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 block">
                        Areas of Operation:
                      </span>
                      <span className="text-slate-800 font-medium">
                        {(f.areas_of_operation || []).join(", ") || "All Districts"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-500 block mb-1">
                      Nutrition Initiatives Supported:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(f.initiatives_supported || []).map((init) => (
                        <span
                          key={init}
                          className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
                        >
                          {init}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 border-t border-slate-100 pt-2">
                    <div>
                      <strong>Official Website / Channel:</strong>{" "}
                      {f.official_website ? (
                        <a
                          href={f.official_website}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-emerald-700 underline"
                        >
                          {f.official_website}
                        </a>
                      ) : (
                        <span className="text-slate-500">
                          Coordinated via platform enquiry reference
                        </span>
                      )}
                    </div>
                    <div>
                      <strong>Contact Info:</strong>{" "}
                      {f.contact_email || f.contact_phone
                        ? `${f.contact_email || ""} ${f.contact_phone || ""}`
                        : "Verified Platform Enquiry Desk"}
                    </div>
                    {f.utilization_summary && (
                      <div className="text-[11px] text-slate-500">
                        <strong>Transparency Note:</strong> {f.utilization_summary}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                  <div className="text-[11px] text-slate-500">
                    Options: {(f.contribution_types || []).join(", ")}
                  </div>
                  <button
                    type="button"
                    disabled={!f.verified}
                    onClick={() => handleSelectFoundationFromCard(f)}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                      f.verified
                        ? "bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm"
                        : "bg-slate-200 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    {f.verified
                      ? "Contribute via Organization →"
                      : "Verification Pending"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. DYNAMIC CONTRIBUTION FORM (Requirement 4) */}
      <section
        id="thalishare-contribution-form"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5"
      >
        <div className="border-b border-slate-200 pb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Submit a Community Contribution Enquiry
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            <strong>Enquiry &amp; Official Redirect Workflow:</strong> Direct online payment processing is not enabled inside ThaliCheck. Submitting this form generates a tracked contribution reference and connects you with the verified organization&apos;s official channel.
          </p>
        </div>

        {formError && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-xs font-semibold text-red-800">
            {formError}
          </div>
        )}

        {submittedReceipt && (
          <div
            data-testid="thalishare-receipt"
            className="rounded-2xl border-2 border-emerald-600 bg-emerald-50 p-5 space-y-3 text-emerald-950"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-extrabold">
                ✅ Contribution Enquiry Recorded — Reference: {submittedReceipt.tracking_ref}
              </h3>
              <span className="rounded bg-emerald-700 px-3 py-1 text-xs font-bold text-white">
                {submittedReceipt.status}
              </span>
            </div>
            <p className="text-xs leading-relaxed">
              {submittedReceipt.receipt_note}
            </p>
            <div className="grid grid-cols-1 gap-2 rounded-xl bg-white p-3.5 text-xs sm:grid-cols-3 border border-emerald-200">
              <div>
                <span className="text-slate-500 block">Recipient Organization</span>
                <strong>{submittedReceipt.foundation_name}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Contribution Type</span>
                <strong>{submittedReceipt.contribution_type}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Estimated Impact</span>
                <strong>
                  {submittedReceipt.meals_supported_est} meals •{" "}
                  {submittedReceipt.children_reached_est} children
                </strong>
              </div>
            </div>
            {submittedReceipt.foundation_website && (
              <div className="pt-1">
                <a
                  href={submittedReceipt.foundation_website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                >
                  Proceed to Organization&apos;s Official Donation Page ↗
                </a>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmitContribution} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name or organization representative"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.org"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">
                Contributor Category
              </label>
              <select
                value={contributorCategory}
                onChange={(e) => setContributorCategory(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="INDIVIDUAL">Individual Citizen</option>
                <option value="STUDENT">Student / University Group</option>
                <option value="COMPANY_CSR">Company / Corporate CSR</option>
                <option value="NGO_ORG">Partner NGO / Foundation</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">
                Selected Verified Foundation *
              </label>
              <select
                required
                value={selectedFoundationId}
                onChange={(e) => setSelectedFoundationId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {eligibleFoundations.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f.is_demo ? "(Demo Template)" : "(Verified)"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">
                Contribution Type *
              </label>
              <select
                value={contributionType}
                onChange={(e) => setContributionType(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {CONTRIBUTION_TYPES.map((ct) => (
                  <option key={ct.id} value={ct.id}>
                    {ct.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* DYNAMIC FIELDS BY CONTRIBUTION TYPE */}
          {contributionType === "MONETARY" && (
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Pledged Contribution Amount (INR) *
                </label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  required
                  value={amountInr}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAmountInr(val);
                    const meals = Math.max(1, Math.round(Number(val) / 25));
                    setEstimatedMeals(String(meals));
                    setEstimatedChildren(String(Math.max(1, Math.round(meals / 2))));
                  }}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Estimated Meals Supported
                </label>
                <input
                  type="number"
                  min="1"
                  value={estimatedMeals}
                  onChange={(e) => setEstimatedMeals(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Estimated Children Reached
                </label>
                <input
                  type="number"
                  min="1"
                  value={estimatedChildren}
                  onChange={(e) => setEstimatedChildren(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {contributionType === "FOOD_SUPPLIES" && (
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-amber-200 bg-amber-50/40 p-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Approved Food / Grocery Category *
                </label>
                <select
                  value={groceryCategory}
                  onChange={(e) => setGroceryCategory(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="Toor Dal & Protein Pulses">
                    Toor Dal &amp; Protein Pulses (sealed grade)
                  </option>
                  <option value="Fortified Rice & Ragi Millets">
                    Fortified Rice &amp; Ragi Millets
                  </option>
                  <option value="Fortified Cooking Oil & Condiments">
                    Fortified Cooking Oil &amp; Condiments
                  </option>
                  <option value="Seasonal Fruits & Micronutrient Produce">
                    Seasonal Fruits &amp; Micronutrient Produce
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Estimated Quantity (kg) *
                </label>
                <input
                  type="number"
                  min="5"
                  required
                  value={groceryQtyKg}
                  onChange={(e) => setGroceryQtyKg(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Delivery / Drop-Off District *
                </label>
                <input
                  type="text"
                  required
                  value={deliveryDistrict}
                  onChange={(e) => setDeliveryDistrict(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {contributionType === "SCHOOL_SPONSORSHIP" && (
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Target School / Anganwadi Centre *
                </label>
                <select
                  value={targetSchoolId}
                  onChange={(e) => setTargetSchoolId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name} ({s.district})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Sponsorship Scope / Duration *
                </label>
                <select
                  value={sponsorshipDuration}
                  onChange={(e) => setSponsorshipDuration(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="1 Month Supplementary Nutrition">
                    1 Month Supplementary Nutrition
                  </option>
                  <option value="1 Term Weekly Protein / Egg Addition">
                    1 Term Weekly Protein / Egg Addition
                  </option>
                  <option value="Annual School Kitchen & Nutrition Support">
                    Annual School Kitchen &amp; Nutrition Support
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Estimated Meals Supported
                </label>
                <input
                  type="number"
                  min="10"
                  value={estimatedMeals}
                  onChange={(e) => setEstimatedMeals(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {contributionType === "INITIATIVE_SUPPORT" && (
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Target Nutrition Initiative *
                </label>
                <select
                  value={targetInitiative}
                  onChange={(e) => setTargetInitiative(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="Protein & Pulse Supplementation">
                    Protein &amp; Pulse Supplementation Drive
                  </option>
                  <option value="Anganwadi Protein & Egg Addition">
                    Anganwadi Protein &amp; Egg Addition
                  </option>
                  <option value="Seasonal Fruit & Micronutrient Drive">
                    Seasonal Fruit &amp; Micronutrient Drive
                  </option>
                  <option value="Kitchen Digital Scale & Standardized Tray Support">
                    Kitchen Digital Scale &amp; Standardized Tray Support
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Estimated Meals Supported
                </label>
                <input
                  type="number"
                  min="10"
                  value={estimatedMeals}
                  onChange={(e) => setEstimatedMeals(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Estimated Children Reached
                </label>
                <input
                  type="number"
                  min="5"
                  value={estimatedChildren}
                  onChange={(e) => setEstimatedChildren(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700">
              Message / Coordination Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Preferred dates, CSR reference note, or specific district preference..."
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <span className="text-xs text-slate-500">
              All contributions are subject to recipient foundation verification and district nutrition norms.
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
            >
              {submitting
                ? "Recording Contribution Enquiry..."
                : "🤝 Submit Contribution Enquiry"}
            </button>
          </div>
        </form>
      </section>

      {/* 6. TRANSPARENCY, TRUST & CONTRIBUTION TRACKER (Requirement 6) */}
      <section
        id="thalishare-tracker"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5"
      >
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Transparency, Utilization &amp; Contribution Tracker
          </h2>
          <p className="text-xs text-slate-600">
            Look up any recorded contribution enquiry by its <strong>Tracking Reference ID</strong> (e.g., <code>TS-DEMO-0001</code>) or contributor email address to inspect its status, acknowledgement note, and utilization updates.
          </p>
        </div>

        <form onSubmit={handleTrackSearch} className="flex flex-wrap gap-3">
          <input
            type="text"
            value={trackQuery}
            onChange={(e) => setTrackQuery(e.target.value)}
            placeholder="Enter Tracking Reference (e.g., TS-DEMO-0001) or Email..."
            className="flex-1 min-w-[240px] rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={trackingLoading}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
          >
            {trackingLoading ? "Searching..." : "🔍 Track Contribution"}
          </button>
          <button
            type="button"
            onClick={() => {
              setTrackQuery("TS-DEMO-0001");
              api.trackThaliShareContribution("TS-DEMO-0001").then(setTrackedResults);
            }}
            className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Try Sample Ref (TS-DEMO-0001)
          </button>
        </form>

        {trackedResults && (
          <div className="space-y-3">
            {trackedResults.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                No contribution enquiries found matching &ldquo;{trackQuery}&rdquo;.
              </div>
            ) : (
              trackedResults.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-bold text-sm text-slate-900">
                      Reference: <span className="font-mono text-emerald-800">{item.tracking_ref}</span> —{" "}
                      {item.foundation_name}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.is_demo && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                          DEMO RECORD
                        </span>
                      )}
                      <span className="rounded-full bg-emerald-100 px-3 py-0.5 font-bold text-emerald-800">
                        {item.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 text-slate-700">
                    <div>
                      <span className="text-slate-500 block">Contributor</span>
                      <strong>{item.full_name}</strong> ({item.contributor_category})
                    </div>
                    <div>
                      <span className="text-slate-500 block">Type &amp; Scope</span>
                      <strong>
                        {item.contribution_type}
                        {item.amount_inr ? ` (₹${item.amount_inr})` : ""}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Target School / Initiative</span>
                      <strong>
                        {item.school_name || item.initiative_name || "General Nutrition"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Estimated Reach</span>
                      <strong>
                        {item.meals_supported_est} meals • {item.children_reached_est} children
                      </strong>
                    </div>
                  </div>

                  <div className="rounded-lg bg-white p-3 border border-slate-200 space-y-1">
                    <div>
                      <strong>Receipt / Acknowledgement Note:</strong>{" "}
                      {item.receipt_note}
                    </div>
                    <div>
                      <strong>Utilization Report Status:</strong>{" "}
                      {item.utilization_report}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}
