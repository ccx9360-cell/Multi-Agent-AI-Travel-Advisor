import { useState } from "react";
import { ArrowLeft, Send, Loader2, Calendar, Users, Wallet, Heart } from "lucide-react";

const BUDGET_OPTIONS = [
  { value: "budget", label: "Budget", desc: "Hostels, street food, public transport" },
  { value: "mid-range", label: "Mid-Range", desc: "3-4 star hotels, local restaurants" },
  { value: "luxury", label: "Luxury", desc: "5-star hotels, fine dining, private tours" },
  { value: "ultra-luxury", label: "Ultra Luxury", desc: "Top suites, Michelin stars, first class" },
];

const INTEREST_OPTIONS = [
  "Food & Cuisine", "History & Culture", "Art & Museums", "Adventure & Outdoors",
  "Beaches & Relaxation", "Nightlife", "Shopping", "Architecture",
  "Nature & Wildlife", "Photography", "Wine & Spirits", "Family Fun",
];

export default function TripDetailsForm({ tripIdea, onSubmit, onBack, disabled }) {
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    travelers: "2",
    travelerDetails: "",
    budget: "mid-range",
    interests: [],
    specialRequirements: "",
    departureCity: "",
  });

  const [errors, setErrors] = useState({});

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const toggleInterest = (interest) => {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const validate = () => {
    const errs = {};
    if (!form.startDate) errs.startDate = "Start date is required";
    if (!form.endDate) errs.endDate = "End date is required";
    if (form.startDate && form.endDate && form.startDate >= form.endDate) {
      errs.endDate = "End date must be after start date";
    }
    if (form.startDate && form.startDate < today) {
      errs.startDate = "Start date cannot be in the past";
    }
    if (!form.departureCity.trim()) errs.departureCity = "Departure city is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate() || disabled) return;

    // Calculate trip duration
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    // Build structured prompt
    const prompt = [
      `Trip Request: ${tripIdea}`,
      ``,
      `Essential Details:`,
      `- Travel Dates: ${form.startDate} to ${form.endDate} (${days} days)`,
      `- Departure City: ${form.departureCity}`,
      `- Number of Travelers: ${form.travelers}`,
      form.travelerDetails ? `- Traveler Details: ${form.travelerDetails}` : null,
      `- Budget Level: ${form.budget}`,
      form.interests.length > 0 ? `- Interests: ${form.interests.join(", ")}` : null,
      form.specialRequirements ? `- Special Requirements: ${form.specialRequirements}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    onSubmit(prompt);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors"
          >
            <ArrowLeft size={16} />
            Change trip idea
          </button>
          <h2 className="text-xl font-bold text-slate-900">Trip Details</h2>
          <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">{tripIdea}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Departure City */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Departure City *
            </label>
            <input
              type="text"
              value={form.departureCity}
              onChange={(e) => update("departureCity", e.target.value)}
              placeholder="e.g., New York, London, Mumbai"
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.departureCity ? "border-red-300" : "border-slate-300"
              }`}
            />
            {errors.departureCity && (
              <p className="text-xs text-red-500 mt-1">{errors.departureCity}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Calendar size={14} className="inline mr-1" />
                Start Date *
              </label>
              <input
                type="date"
                value={form.startDate}
                min={today}
                onChange={(e) => update("startDate", e.target.value)}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.startDate ? "border-red-300" : "border-slate-300"
                }`}
              />
              {errors.startDate && (
                <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Calendar size={14} className="inline mr-1" />
                End Date *
              </label>
              <input
                type="date"
                value={form.endDate}
                min={form.startDate || today}
                onChange={(e) => update("endDate", e.target.value)}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.endDate ? "border-red-300" : "border-slate-300"
                }`}
              />
              {errors.endDate && (
                <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* Travelers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Users size={14} className="inline mr-1" />
                Number of Travelers
              </label>
              <select
                value={form.travelers}
                onChange={(e) => update("travelers", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "traveler" : "travelers"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Traveler Details
              </label>
              <input
                type="text"
                value={form.travelerDetails}
                onChange={(e) => update("travelerDetails", e.target.value)}
                placeholder="e.g., couple, family with kids (ages 8, 12)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Wallet size={14} className="inline mr-1" />
              Budget Level
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BUDGET_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("budget", opt.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    form.budget === opt.value
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      form.budget === opt.value ? "text-blue-700" : "text-slate-700"
                    }`}
                  >
                    {opt.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Heart size={14} className="inline mr-1" />
              Interests (select all that apply)
            </label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    form.interests.includes(interest)
                      ? "bg-blue-100 text-blue-700 border border-blue-300"
                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* Special Requirements */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Special Requirements (optional)
            </label>
            <textarea
              value={form.specialRequirements}
              onChange={(e) => update("specialRequirements", e.target.value)}
              placeholder="e.g., vegetarian meals, wheelchair accessible, fear of heights, pet-friendly hotels..."
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={disabled}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
          >
            {disabled ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Planning...
              </>
            ) : (
              <>
                <Send size={18} />
                Plan My Trip
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
