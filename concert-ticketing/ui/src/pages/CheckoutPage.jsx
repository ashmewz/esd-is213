import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, ChevronDown, X } from "lucide-react";
import { useCart } from "../context/CartContext";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cartItems, cartTotal, FEE, removeFromCart, clearCart } = useCart();

  const [openStep,        setOpenStep]        = useState(1);
  const [completedSteps,  setCompletedSteps]  = useState(new Set());
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [sameAddress,     setSameAddress]     = useState(true);
  const [errors,         setErrors]         = useState({});
  const [form, setForm] = useState({
    firstName: "", lastName: "", mobile: "", email: "", confirmEmail: "",
    addressLine1: "", addressLine2: "", city: "", postalCode: "",
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: false }));
  }

  function handleNextStep1() {
    const required = ["firstName", "lastName", "mobile", "email", "confirmEmail"];
    const newErrors = {};
    required.forEach((k) => { if (!form[k].trim()) newErrors[k] = true; });
    if (form.email && form.confirmEmail && form.email !== form.confirmEmail) {
      newErrors.confirmEmail = "Emails do not match";
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setCompletedSteps((prev) => new Set([...prev, 1]));
    setOpenStep(2);
  }

  function handleNextStep2() {
    setCompletedSteps((prev) => new Set([...prev, 2]));
    setOpenStep(3);
  }

  function handleNextStep3() {
    navigate("/confirmation", { state: { form, cartItems } });
  }

  const inputClass = (name) =>
    `w-full border-b pb-1 pt-2 outline-none text-sm text-gray-800 bg-transparent transition
    ${errors[name] ? "border-red-400 focus:border-red-500" : "border-gray-300 focus:border-orange-500"}`;

  const labelClass = "block text-xs text-gray-400 mb-0.5";

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Finalise Order</h1>

        <div className="flex gap-10">

          {/* ── Left: steps ──────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Step 1 */}
            <div className="border-b border-gray-300 mb-2">
              <button
                className="w-full flex justify-between items-center py-4"
                onClick={() => setOpenStep(openStep === 1 ? 0 : 1)}
              >
                <span className={`text-lg font-bold ${openStep === 1 ? "text-gray-900" : "text-gray-400"}`}>
                  1. Patron Details
                </span>
                {openStep === 1 ? <ChevronDown size={20} /> : <ChevronRight size={20} className="text-gray-400" />}
              </button>

              {openStep === 1 && (
                <div className="pb-8">
                  <p className="text-right text-xs text-gray-500 mb-6">
                    <span className="text-red-500">*</span> is mandatory
                  </p>

                  {/* Personal fields */}
                  <div className="space-y-6 mb-8">
                    <div>
                      <label className={labelClass}>First Name <span className="text-red-500">*</span></label>
                      <input name="firstName" value={form.firstName} onChange={handleChange} className={inputClass("firstName")} />
                      {errors.firstName && <p className="text-xs text-red-400 mt-1">Required</p>}
                    </div>
                    <div>
                      <label className={labelClass}>Last Name <span className="text-red-500">*</span></label>
                      <input name="lastName" value={form.lastName} onChange={handleChange} className={inputClass("lastName")} />
                      {errors.lastName && <p className="text-xs text-red-400 mt-1">Required</p>}
                    </div>
                    <div>
                      <label className={labelClass}>Mobile <span className="text-red-500">*</span></label>
                      <div className={`flex items-center border-b pb-1 pt-2 gap-2 transition ${errors.mobile ? "border-red-400" : "border-gray-300 focus-within:border-orange-500"}`}>
                        <span className="text-sm text-gray-600 shrink-0">🇸🇬 +65</span>
                        <input
                          name="mobile" value={form.mobile} onChange={handleChange}
                          className="flex-1 outline-none text-sm text-gray-800 bg-transparent"
                          placeholder=""
                        />
                      </div>
                      {errors.mobile && <p className="text-xs text-red-400 mt-1">Required</p>}
                    </div>
                    <div>
                      <label className={labelClass}>Email <span className="text-red-500">*</span></label>
                      <input name="email" type="email" value={form.email} onChange={handleChange} className={inputClass("email")} />
                      {errors.email && <p className="text-xs text-red-400 mt-1">Required</p>}
                    </div>
                    <div>
                      <label className={labelClass}>Confirm Email <span className="text-red-500">*</span></label>
                      <input name="confirmEmail" type="email" value={form.confirmEmail} onChange={handleChange} className={inputClass("confirmEmail")} />
                      {errors.confirmEmail && (
                        <p className="text-xs text-red-400 mt-1">
                          {errors.confirmEmail === true ? "Required" : errors.confirmEmail}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Billing Address */}
                  <h2 className="text-lg font-bold text-gray-900 mb-5">Billing Address</h2>
                  <div className="mb-5">
                    <label className={labelClass}>Country</label>
                    <div className="flex items-center gap-2 border-b border-gray-300 pb-1 pt-2">
                      <span>🇸🇬</span>
                      <span className="text-sm text-gray-700 font-medium">SINGAPORE</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">Enter your address below</p>
                  <div className="grid grid-cols-2 gap-6 mb-5">
                    <div>
                      <label className={labelClass}>Address Line 1</label>
                      <input name="addressLine1" value={form.addressLine1} onChange={handleChange} className={inputClass("addressLine1")} />
                    </div>
                    <div>
                      <label className={labelClass}>Address Line 2</label>
                      <input name="addressLine2" value={form.addressLine2} onChange={handleChange} className={inputClass("addressLine2")} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 mb-5">
                    <div>
                      <label className={labelClass}>Suburb/City/Town</label>
                      <input name="city" value={form.city} onChange={handleChange} className={inputClass("city")} />
                    </div>
                    <div>
                      <label className={labelClass}>Zip/Postal Code</label>
                      <input name="postalCode" value={form.postalCode} onChange={handleChange} className={inputClass("postalCode")} />
                    </div>
                  </div>

                  {/* Mailing Address */}
                  <h2 className="text-lg font-bold text-gray-900 mb-4 mt-8">Mailing Address</h2>
                  <div className="flex items-center gap-6 mb-8">
                    <span className="text-sm text-gray-700">Same as Billing Address?</span>
                    <div className="flex">
                      <button
                        onClick={() => setSameAddress(true)}
                        className={`px-5 py-2 text-sm font-bold transition ${sameAddress ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300"}`}
                      >YES</button>
                      <button
                        onClick={() => setSameAddress(false)}
                        className={`px-5 py-2 text-sm font-bold transition ${!sameAddress ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300"}`}
                      >NO</button>
                    </div>
                  </div>

                  {/* Next */}
                  <div className="flex justify-center mb-2">
                    <button
                      onClick={handleNextStep1}
                      className="px-16 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded transition flex items-center gap-2"
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2 */}
            <div className="border-b border-gray-300 mb-2">
              <div className="relative group">
                <button
                  className={`w-full flex justify-between items-center py-4 ${completedSteps.has(1) ? "cursor-pointer" : "cursor-not-allowed"}`}
                  onClick={() => completedSteps.has(1) && setOpenStep(openStep === 2 ? 0 : 2)}
                >
                  <span className={`text-lg font-bold ${openStep === 2 ? "text-gray-900" : "text-gray-400"}`}>
                    2. Select Ticket Delivery Method
                  </span>
                  <ChevronDown size={20} className={openStep === 2 ? "text-gray-700" : "text-gray-400"} />
                </button>
                {!completedSteps.has(1) && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 z-20 hidden group-hover:block">
                    <div className="bg-white border border-gray-200 shadow-lg rounded-lg px-5 py-4 text-sm text-gray-600 w-72 text-center relative">
                      Please complete the above section to continue to the next step.
                      <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
                        style={{ borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "8px solid white", filter: "drop-shadow(0 1px 0 #e5e7eb)" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {openStep === 2 && (
                <div className="pb-8">
                  <p className="font-semibold text-gray-800 mb-5">
                    Please select a delivery method and click 'Next' to continue.
                  </p>
                  <button
                    onClick={() => setSelectedDelivery(selectedDelivery === "eticket" ? null : "eticket")}
                    className={`font-semibold px-6 py-3 rounded mb-5 text-sm border-2 transition
                      ${selectedDelivery === "eticket"
                        ? "bg-orange-500 border-orange-500 text-white"
                        : "bg-white border-gray-300 text-gray-700 hover:border-orange-400"}`}
                  >
                    eTicket – $0.00
                  </button>
                  <div className="border border-orange-400 rounded-lg p-5 text-sm text-gray-700 mb-8">
                    Your tickets/items will be sent attached to your confirmation as a PDF to your nominated email address.
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={handleNextStep2}
                      className="px-16 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded transition flex items-center gap-2"
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3 */}
            <div className="border-b border-gray-300 mb-8">
              <div className="relative group">
                <button
                  className={`w-full flex justify-between items-center py-4 ${completedSteps.has(2) ? "cursor-pointer" : "cursor-not-allowed"}`}
                  onClick={() => completedSteps.has(2) && setOpenStep(openStep === 3 ? 0 : 3)}
                >
                  <span className={`text-lg font-bold ${openStep === 3 ? "text-gray-900" : "text-gray-400"}`}>
                    3. Payment
                  </span>
                  <ChevronDown size={20} className={openStep === 3 ? "text-gray-700" : "text-gray-400"} />
                </button>
                {!completedSteps.has(2) && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 z-20 hidden group-hover:block">
                    <div className="bg-white border border-gray-200 shadow-lg rounded-lg px-5 py-4 text-sm text-gray-600 w-72 text-center relative">
                      Please complete the above section to continue to the next step.
                      <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
                        style={{ borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "8px solid white", filter: "drop-shadow(0 1px 0 #e5e7eb)" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {openStep === 3 && (
                <div className="pb-8">
                  <p className="font-semibold text-gray-800 mb-5">Select a payment method.</p>
                  <div className="border rounded-lg p-5 mb-6">
                    <p className="text-sm font-semibold text-gray-700 mb-4">Credit / Debit Card</p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Card Number</label>
                        <input placeholder="1234 5678 9012 3456" className="w-full border-b border-gray-300 focus:border-orange-500 outline-none py-2 text-sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Expiry (MM/YY)</label>
                          <input placeholder="MM/YY" className="w-full border-b border-gray-300 focus:border-orange-500 outline-none py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">CVV</label>
                          <input placeholder="123" className="w-full border-b border-gray-300 focus:border-orange-500 outline-none py-2 text-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Name on Card</label>
                        <input className="w-full border-b border-gray-300 focus:border-orange-500 outline-none py-2 text-sm" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={handleNextStep3}
                      className="px-16 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded transition flex items-center gap-2"
                    >
                      Place Order <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom actions */}
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-orange-500 transition"
              >
                <ChevronLeft size={14} /> Continue shopping
              </button>
              <button
                onClick={() => { clearCart(); navigate("/events"); }}
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* ── Right: order summary ──────────────────────────── */}
          <div className="w-72 shrink-0">
            {cartItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center mt-8">Your cart is empty.</p>
            ) : (
              <>
                {cartItems.map(({ seat, event, date, time }) => (
                  <div key={seat.seatId} className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
                    <div className="flex gap-3 mb-3">
                      <div className="w-14 h-14 bg-gray-200 rounded overflow-hidden shrink-0 flex items-center justify-center text-2xl">
                        🎵
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="font-semibold text-sm text-gray-800 leading-tight">{event.name}</p>
                          <button onClick={() => removeFromCart(seat.seatId)} className="text-gray-400 hover:text-red-500 ml-1 shrink-0">
                            <X size={13} />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{event.venue}</p>
                        <p className="text-xs text-gray-500">{date}, {time}</p>
                      </div>
                    </div>
                    <div className="text-right mb-2">
                      <span
                        onClick={() => navigate(`/events/${event.eventId}`)}
                        className="text-xs text-orange-500 underline cursor-pointer hover:text-orange-600"
                      >(Add Ticket)</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-700 mb-1">
                      <span>1 x Adult (${seat.basePrice})</span>
                      <span>${seat.basePrice}.00</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>(+${seat.basePrice + FEE}), Seat: {seat.rowNo}, {seat.seatNo}</span>
                      <span>+ ${FEE}.00</span>
                    </div>
                  </div>
                ))}

                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal:</span>
                    <span>${cartTotal}.00</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Delivery:</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
                    <span>TOTAL:</span>
                    <span>${cartTotal}.00</span>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
