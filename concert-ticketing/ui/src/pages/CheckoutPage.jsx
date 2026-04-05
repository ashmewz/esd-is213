import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, ChevronDown, X } from "lucide-react";
import { useCart } from "../context/CartContext";
import { createBooking } from "../api";
import { useAuth } from "../context/AuthContext";

const BOOKING_ERROR_COPY = {
  SEAT_UNAVAILABLE: {
    title: "Seat no longer available",
    message: "One of your selected seats was just taken by another customer. Please return to the seat map and choose a different seat.",
  },
  HOLD_EXPIRED: {
    title: "Reservation expired",
    message: "Your checkout session took too long and the temporary seat hold expired. Please reselect your tickets and try again.",
  },
  PAYMENT_FAILED: {
    title: "Payment could not be processed",
    message: "Your bank or card provider did not approve the charge. Please check your card details or try another card.",
  },
  REFUND_REQUIRED: {
    title: "Payment captured but booking could not be completed",
    message: "We have started a refund for this failed booking attempt. Please wait for confirmation before trying again.",
  },
  UNKNOWN_ERROR: {
    title: "We could not place your order",
    message: "Something unexpected happened while processing your booking. Please review your details and try again.",
  },
};

function getBookingErrorContent(error) {
  const code = error?.code || "UNKNOWN_ERROR";
  return BOOKING_ERROR_COPY[code] || BOOKING_ERROR_COPY.UNKNOWN_ERROR;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cartItems, cartTotal, FEE, removeFromCart, clearCart } = useCart();
  const { currentUserId } = useAuth();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const [openStep,        setOpenStep]        = useState(1);
  const [completedSteps,  setCompletedSteps]  = useState(new Set());
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [sameAddress,     setSameAddress]     = useState(true);
  const [errors,         setErrors]         = useState({});
  const [paymentErrors,  setPaymentErrors]  = useState({});
  const [submitError,    setSubmitError]    = useState("");
  const [submitting,     setSubmitting]     = useState(false);
  const [payment, setPayment] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    nameOnCard: "",
  });
  const [form, setForm] = useState({
    firstName: "", lastName: "", mobile: "", email: "", confirmEmail: "",
    addressLine1: "", addressLine2: "", city: "", postalCode: "",
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: false }));
    if (submitError) setSubmitError("");
  }

  function handlePaymentChange(e) {
    const { name, value } = e.target;
    setPayment((prev) => ({ ...prev, [name]: value }));
    if (paymentErrors[name]) setPaymentErrors((prev) => ({ ...prev, [name]: false }));
    if (submitError) setSubmitError("");
  }

  function validatePaymentDetails() {
    const nextErrors = {};
    const normalizedCard = payment.cardNumber.replace(/\s+/g, "");

    if (!/^\d{12,19}$/.test(normalizedCard)) {
      nextErrors.cardNumber = "Enter a valid card number";
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(payment.expiry.trim())) {
      nextErrors.expiry = "Use MM/YY format";
    }
    if (!/^\d{3,4}$/.test(payment.cvv.trim())) {
      nextErrors.cvv = "Enter a valid CVV";
    }
    if (!payment.nameOnCard.trim()) {
      nextErrors.nameOnCard = "Required";
    }

    setPaymentErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
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
    if (!selectedDelivery) return;
    setCompletedSteps((prev) => new Set([...prev, 2]));
    setOpenStep(3);
  }

  async function handleNextStep3() {
    if (cartItems.length === 0) {
      setSubmitError("Your cart is empty. Please add at least one ticket before placing your order.");
      return;
    }
    if (!selectedDelivery) {
      setSubmitError("Please choose a delivery method before placing your order.");
      return;
    }
    if (!validatePaymentDetails()) {
      setSubmitError("Please complete the payment section before placing your order.");
      return;
    }

    setSubmitError("");
    setSubmitting(true);
    try {
      const booking = await createBooking({
        userId: currentUserId,
        eventName: cartItems[0]?.event?.name,
        venueName: cartItems[0]?.event?.venueName ?? cartItems[0]?.event?.venue,
        patron: {
          firstName: form.firstName,
          lastName: form.lastName,
          mobile: form.mobile,
          email: form.email,
        },
        deliveryMethod: selectedDelivery,
        sameAddress,
        billingAddress: {
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2,
          city: form.city,
          postalCode: form.postalCode,
        },
        payment: {
          cardNumber: payment.cardNumber,
          expiry: payment.expiry,
          cvv: payment.cvv,
          nameOnCard: payment.nameOnCard,
        },
        items: cartItems.map(({ seat, event, date, time, holdId }) => ({
          eventId: event.eventId,
          seatId: seat.seatId,
          holdId,
          date,
          time,
          price: seat.basePrice,
          tier: seat.tier,
          sectionNo: seat.sectionNo,
          rowNo: seat.rowNo,
          seatNo: seat.seatNo,
          seatLabel: `Section ${seat.sectionNo} · Row ${seat.rowNo} · Seat ${seat.seatNo}`,
        })),
      });

      navigate("/confirmation", {
        state: {
          form,
          cartItems,
          orderId: booking.orderId,
          bookingStatus: booking.status,
          deliveryMethod: selectedDelivery,
        },
      });
    } catch (error) {
      const content = getBookingErrorContent(error);
      setSubmitError(`${content.title}: ${content.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = (name) =>
    `w-full border-b pb-1 pt-2 outline-none text-sm text-gray-800 bg-transparent transition
    ${errors[name] ? "border-red-400 focus:border-red-500" : "border-gray-300 focus:border-[#800020]"}`;
  const paymentInputClass = (name) =>
    `w-full border-b py-2 text-sm outline-none transition ${
      paymentErrors[name]
        ? "border-red-400 focus:border-red-500"
        : "border-gray-300 focus:border-[#800020]"
    }`;

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
                      <div className={`flex items-center border-b pb-1 pt-2 gap-2 transition ${errors.mobile ? "border-red-400" : "border-gray-300 focus-within:border-[#800020]"}`}>
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
                        className={`px-5 py-2 text-sm font-bold transition ${sameAddress ? "bg-[#800020] text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300"}`}
                      >YES</button>
                      <button
                        onClick={() => setSameAddress(false)}
                        className={`px-5 py-2 text-sm font-bold transition ${!sameAddress ? "bg-[#800020] text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300"}`}
                      >NO</button>
                    </div>
                  </div>

                  {/* Next */}
                  <div className="flex justify-center mb-2">
                    <button
                      onClick={handleNextStep1}
                      className="px-16 py-3 bg-[#800020] hover:bg-[#6a001a] text-white font-semibold rounded transition flex items-center gap-2"
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
                        ? "bg-[#800020] border-[#800020] text-white"
                        : "bg-white border-gray-300 text-gray-700 hover:border-[#6a001a]"}`}
                  >
                    eTicket – $0.00
                  </button>
                  <div className="border border-[#6a001a] rounded-lg p-5 text-sm text-gray-700 mb-8">
                    Your tickets/items will be sent attached to your confirmation as a PDF to your nominated email address.
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={handleNextStep2}
                      disabled={!selectedDelivery}
                      className="px-16 py-3 bg-[#800020] hover:bg-[#6a001a] text-white font-semibold rounded transition flex items-center gap-2"
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
                        <input
                          name="cardNumber"
                          value={payment.cardNumber}
                          onChange={handlePaymentChange}
                          placeholder="1234 5678 9012 3456"
                          className={paymentInputClass("cardNumber")}
                        />
                        {paymentErrors.cardNumber && (
                          <p className="mt-1 text-xs text-red-500">{paymentErrors.cardNumber}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Expiry (MM/YY)</label>
                          <input
                            name="expiry"
                            value={payment.expiry}
                            onChange={handlePaymentChange}
                            placeholder="MM/YY"
                            className={paymentInputClass("expiry")}
                          />
                          {paymentErrors.expiry && (
                            <p className="mt-1 text-xs text-red-500">{paymentErrors.expiry}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">CVV</label>
                          <input
                            name="cvv"
                            value={payment.cvv}
                            onChange={handlePaymentChange}
                            placeholder="123"
                            className={paymentInputClass("cvv")}
                          />
                          {paymentErrors.cvv && (
                            <p className="mt-1 text-xs text-red-500">{paymentErrors.cvv}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Name on Card</label>
                        <input
                          name="nameOnCard"
                          value={payment.nameOnCard}
                          onChange={handlePaymentChange}
                          className={paymentInputClass("nameOnCard")}
                        />
                        {paymentErrors.nameOnCard && (
                          <p className="mt-1 text-xs text-red-500">{paymentErrors.nameOnCard}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {submitError && (
                    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {submitError}
                    </div>
                  )}
                  <div className="flex justify-center">
                    <button
                      onClick={handleNextStep3}
                      disabled={submitting || cartItems.length === 0}
                      className="px-16 py-3 bg-[#800020] hover:bg-[#6a001a] text-white font-semibold rounded transition flex items-center gap-2"
                    >
                      {submitting ? "Processing Order..." : "Place Order"} <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom actions */}
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-[#800020] transition"
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
                {cartItems.map(({ seat, event, date, time }) => {
                  const seatPrice = seat.price ?? seat.basePrice;
                  return (
                  <div key={seat.seatId} className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
                    {/* Event header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 leading-tight">{event.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{event.venueName ?? event.venue}</p>
                        <p className="text-xs text-gray-500">{date} · {time}</p>
                      </div>
                      <button onClick={() => removeFromCart(seat.seatId)} className="text-gray-400 hover:text-red-500 ml-2 shrink-0">
                        <X size={13} />
                      </button>
                    </div>

                    {/* Seat details */}
                    <div className="bg-white border border-gray-200 rounded-md px-3 py-2 mb-3 text-xs text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Tier</span>
                        <span className="font-medium text-gray-800">{seat.tier}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Section</span>
                        <span className="font-medium text-gray-800">{seat.sectionNo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Row</span>
                        <span className="font-medium text-gray-800">{seat.rowNo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Seat</span>
                        <span className="font-medium text-gray-800">{seat.seatNo}</span>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="flex justify-between text-sm text-gray-700 mb-1">
                      <span>1 x Adult</span>
                      <span>${seatPrice}.00</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Booking fee</span>
                      <span>+${FEE}.00</span>
                    </div>
                  </div>
                  );
                })}

                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal:</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Delivery:</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
                    <span>TOTAL:</span>
                    <span>${cartTotal.toFixed(2)}</span>
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
