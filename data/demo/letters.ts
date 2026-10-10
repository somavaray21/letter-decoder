import type { DemoLetter } from "./index";

// Transcribed text of the fictional sample letters, shared by both languages (the letters are in English).
// Demo results get this as fullText so the letter chat works in demo mode too.
export const LETTER_TEXT: Record<DemoLetter, string> = {
  eviction: `Maple Street Apartments LLC
412 Maple Street, Office 1
Camden, NJ 08102
(856) 555-0142

October 10, 2026

Jordan Rivera
412 Maple Street, Apt 3B
Camden, NJ 08102

NOTICE TO PAY RENT OR QUIT

Dear Tenant,

Our records show that you owe $1,450.00 in unpaid rent for the month of October 2026.

You are required to pay the full amount of $1,450.00 or vacate the premises within fourteen (14) days of service of this notice.

If you fail to pay the full amount or vacate the premises, the landlord may file a complaint for eviction in the Superior Court of New Jersey, Special Civil Part, Landlord/Tenant Section.

Payment may be made by money order or certified check at the management office, Monday through Friday, 9:00 AM to 5:00 PM. Cash is not accepted.

If you have questions about this notice, please call the management office at (856) 555-0142.

Sincerely,
Dana Whitfield
Property Manager
Maple Street Apartments LLC`,

  medicaid: `State Department of Health Services
Division of Medical Assistance
PO Box 712
Trenton, NJ 08625
Customer Service: 1-800-555-0199 (TTY 711)

October 1, 2026

Jordan Rivera
412 Maple Street, Apt 3B
Camden, NJ 08102

Case Number: 4471-2209

IMPORTANT: Time to renew your Medicaid coverage

It is time to renew your health coverage. We need to make sure you still qualify.

What you need to do:
1. Complete and sign the enclosed renewal form.
2. Send proof of income for everyone in your household, such as your last 4 pay stubs.

Your completed renewal form and income documents must be received by November 15, 2026, or your coverage will end on November 30, 2026.

You can return your form by mail using the enclosed envelope, online at the state benefits portal, or in person at your county welfare agency.

If you have questions, call Customer Service at 1-800-555-0199, Monday through Friday, 8:00 AM to 5:00 PM.

If you disagree with any decision about your coverage, you have the right to ask for a fair hearing.`,

  medical_bill: `Riverside General Hospital
Patient Billing Office
1200 River Road
Camden, NJ 08103
Billing questions: (856) 555-0177

Statement Date: October 10, 2026

Jordan Rivera
412 Maple Street, Apt 3B
Camden, NJ 08102

Account Number: RGH-559031

Date of Service: September 2, 2026
Emergency Department Visit

Total Charges: $3,120.00
Insurance Payments: -$740.00
Amount You Owe: $2,380.00

Payment in full or a payment arrangement is due by November 9, 2026.

Riverside General Hospital offers financial assistance (charity care) to patients who qualify based on income. To ask for an application, call (856) 555-0177 or visit the Patient Billing Office.

You may request an itemized bill at any time.

To pay, call (856) 555-0177, mail a check with the stub below, or pay online at the patient portal.`,

  snap: `County Department of Social Services
Supplemental Nutrition Assistance Program (SNAP)
600 Market Street
Camden, NJ 08102
SNAP Office: (856) 555-0123

October 8, 2026

Jordan Rivera
412 Maple Street, Apt 3B
Camden, NJ 08102

Case Number: SN-88213

NOTICE OF RECERTIFICATION INTERVIEW

Your SNAP benefits are due for recertification. To keep getting benefits, you must complete an interview and send proof of your household's current situation.

Your recertification interview is scheduled by telephone on October 28, 2026 at 10:00 AM. Your caseworker will call you at the phone number we have on file.

Please send the following:
- Proof of income for the last 30 days (such as pay stubs)
- Proof of rent (such as your lease or a rent receipt)

Verification documents must be returned by October 31, 2026, or your benefits will end.

If you cannot be available at the scheduled time, or you miss the call, contact the SNAP Office at (856) 555-0123 as soon as possible to reschedule.`,

  financial_aid: `Lakeside Community College
Office of Financial Aid
200 College Drive
Blackwood, NJ 08012
(856) 555-0188 | finaid@lakeside.example.edu

October 5, 2026

Jordan Rivera
412 Maple Street, Apt 3B
Camden, NJ 08102

Student ID: 00731942

Subject: Additional Documents Needed – Verification

Your Free Application for Federal Student Aid (FAFSA) has been selected for a review process called verification. We cannot finish your financial aid award until this review is complete.

Please submit the Verification Worksheet and an IRS Tax Return Transcript no later than December 1, 2026.

You can download the Verification Worksheet from the student portal. You can get a free IRS Tax Return Transcript at irs.gov.

Until we receive these documents, your Federal Pell Grant for the Spring 2027 term will not be paid.

Upload your documents through the student portal or bring them to the Office of Financial Aid. If you have questions, call (856) 555-0188 or email finaid@lakeside.example.edu.`,
};
