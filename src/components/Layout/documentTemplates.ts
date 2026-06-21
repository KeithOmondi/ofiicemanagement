// src/features/documents/documentTemplates.ts

export type TemplateType = 'memo' | 'letter' | 'draft';

interface TemplateContext {
  registrarName?: string;
  registrarTitle?: string;
  date?: string;
  refNo?: string;
}

const formatDate = (): string =>
  new Date().toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).toUpperCase(); // e.g. "20 JUNE 2026"

// ── MEMO ─────────────────────────────────────────────────────────────────────

const memoTemplate = (ctx: TemplateContext): string => `
<div style="font-family: 'Times New Roman', Times, serif; max-width: 700px; margin: 0 auto; padding: 40px;">

  <!-- Header -->
  <table width="100%" style="border-bottom: 2px solid #1E4620; margin-bottom: 24px;">
    <tr>
      <td align="center" style="padding-bottom: 12px;">
        <img src="https://res.cloudinary.com/do0yflasl/image/upload/v1781759596/JOB_LOGO_ubls4m.jpg" alt="Judiciary" height="80" />
        <p style="margin: 4px 0 0; font-size: 13px; font-weight: bold; color: #1E4620; letter-spacing: 1px;">
          OFFICE OF THE REGISTRAR HIGH COURT
        </p>
      </td>
    </tr>
  </table>

  <!-- MEMO title -->
  <p style="text-align: center; font-size: 16px; font-weight: bold; letter-spacing: 3px; margin-bottom: 24px;">
    MEMO
  </p>

  <!-- Fields -->
  <table width="100%" style="font-size: 13px; border-collapse: collapse; margin-bottom: 32px;">
    <tr>
      <td style="width: 80px; font-weight: bold; padding: 4px 0;">TO</td>
      <td style="padding: 4px 0;">:&nbsp;&nbsp;
        <span data-field="to" style="border-bottom: 1px solid #000; display: inline-block; min-width: 300px;">
          [RECIPIENT NAME / DESIGNATION]
        </span>
      </td>
    </tr>
    <tr>
      <td style="font-weight: bold; padding: 4px 0;">FROM</td>
      <td style="padding: 4px 0;">:&nbsp;&nbsp;THE REGISTRAR, HIGH COURT</td>
    </tr>
    <tr>
      <td style="font-weight: bold; padding: 4px 0;">REF</td>
      <td style="padding: 4px 0;">:&nbsp;&nbsp;
        <span data-field="ref" style="border-bottom: 1px solid #000; display: inline-block; min-width: 160px;">
          ${ctx.refNo ?? 'RHC/____'}
        </span>
      </td>
    </tr>
    <tr>
      <td style="font-weight: bold; padding: 4px 0;">DATE</td>
      <td style="padding: 4px 0;">:&nbsp;&nbsp;${ctx.date ?? formatDate()}</td>
    </tr>
    <tr>
      <td style="font-weight: bold; padding: 4px 0;">SUBJECT</td>
      <td style="padding: 4px 0;">:&nbsp;&nbsp;
        <span data-field="subject" style="border-bottom: 1px solid #000; display: inline-block; min-width: 300px;">
          [ENTER SUBJECT OF MEMO]
        </span>
      </td>
    </tr>
  </table>

  <!-- Salutation -->
  <p style="margin-bottom: 16px;">Greetings from the Office of the Registrar, High Court.</p>

  <!-- Body -->
  <p data-field="body" style="min-height: 120px; margin-bottom: 48px;">
    [Begin memo body here.]
  </p>

  <!-- Signature -->
  <div style="margin-top: 60px;">
    <p style="font-family: 'Brush Script MT', cursive; font-size: 22px; margin-bottom: 0; color: #1E4620;">
      ${ctx.registrarName ?? 'Clara Otieno-Omondi'}
    </p>
    <p style="font-weight: bold; margin: 4px 0 0; font-size: 12px; text-transform: uppercase;">
      ${ctx.registrarName?.toUpperCase() ?? 'CLARA OTIENO-OMONDI'}
    </p>
    <p style="margin: 2px 0 0; font-size: 12px;">
      ${ctx.registrarTitle ?? 'REGISTRAR, HIGH COURT'}
    </p>
    <p style="margin: 2px 0 0; font-size: 12px; color: #888;">Date: ___________</p>
  </div>

</div>
`;

// ── LETTER ────────────────────────────────────────────────────────────────────

const letterTemplate = (ctx: TemplateContext): string => `
<div style="font-family: 'Times New Roman', Times, serif; max-width: 700px; margin: 0 auto; padding: 40px;">

  <!-- Header -->
  <table width="100%" style="border-bottom: 3px solid #C29B38; margin-bottom: 20px;">
    <tr>
      <td style="width: 80px; padding-bottom: 12px;">
        <img src="https://res.cloudinary.com/do0yflasl/image/upload/v1781759596/JOB_LOGO_ubls4m.jpg" alt="Judiciary" height="64" />
      </td>
      <td style="padding-bottom: 12px;">
        <p style="margin: 0; font-size: 16px; font-weight: bold; color: #1a1a1a; letter-spacing: 1px;">
          THE JUDICIARY
        </p>
        <p style="margin: 2px 0 0; font-size: 11px; color: #444;">
          OFFICE OF THE REGISTRAR HIGH COURT
        </p>
      </td>
    </tr>
  </table>

  <!-- Ref and Date -->
  <table width="100%" style="font-size: 12px; margin-bottom: 24px;">
    <tr>
      <td>
        Ref: <span data-field="ref" style="border-bottom: 1px solid #000; display: inline-block; min-width: 140px;">
          ${ctx.refNo ?? 'RHC/DCM/____'}
        </span>
      </td>
      <td style="text-align: right;">${ctx.date ?? formatDate()}</td>
    </tr>
  </table>

  <!-- Recipient -->
  <div style="font-size: 13px; margin-bottom: 24px; line-height: 1.8;">
    <p data-field="recipient-title" style="margin: 0;">[Title e.g. The Director]</p>
    <p data-field="recipient-name" style="margin: 0;">Mrs. [Organisation Name]</p>
    <p data-field="recipient-address" style="margin: 0; font-weight: bold; text-decoration: underline;">
      NAIROBI
    </p>
  </div>

  <!-- Subject -->
  <p style="font-size: 13px; margin-bottom: 24px;">
    <strong>RE:
      <span data-field="subject" style="border-bottom: 1px solid #000; display: inline-block; min-width: 280px;">
        [SUBJECT OF LETTER]
      </span>
    </strong>
  </p>

  <!-- Body -->
  <p data-field="body" style="font-size: 13px; min-height: 120px; margin-bottom: 48px; line-height: 1.8;">
    [Begin letter body here.]
  </p>

  <!-- Closing -->
  <p style="font-size: 13px; margin-bottom: 40px;">Yours faithfully,</p>

  <!-- Signature -->
  <div>
    <p style="font-family: 'Brush Script MT', cursive; font-size: 22px; margin-bottom: 0; color: #1E4620;">
      ${ctx.registrarName ?? 'Clara Otieno-Omondi'}
    </p>
    <p style="font-weight: bold; margin: 4px 0 0; font-size: 12px; text-transform: uppercase;">
      ${ctx.registrarName?.toUpperCase() ?? 'CLARA OTIENO-OMONDI'}
    </p>
    <p style="margin: 2px 0 0; font-size: 12px;">
      ${ctx.registrarTitle ?? 'REGISTRAR, HIGH COURT'}
    </p>
  </div>

</div>
`;

// ── BLANK DRAFT ───────────────────────────────────────────────────────────────

const draftTemplate = (ctx: TemplateContext): string => `
<div style="font-family: 'Times New Roman', Times, serif; max-width: 700px; margin: 0 auto; padding: 40px;">

  <!-- Header -->
  <div style="text-align: center; border-bottom: 2px solid #1E4620; padding-bottom: 12px; margin-bottom: 24px;">
    <img src="https://res.cloudinary.com/do0yflasl/image/upload/v1781759596/JOB_LOGO_ubls4m.jpg" alt="Judiciary" height="64" />
    <p style="margin: 6px 0 0; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
      OFFICE OF THE REGISTRAR
    </p>
    <p style="margin: 2px 0 0; font-size: 11px; text-transform: uppercase; color: #555;">
      HIGH COURT OF KENYA
    </p>
  </div>

  <!-- Ref and Date -->
  <table width="100%" style="font-size: 12px; margin-bottom: 32px;">
    <tr>
      <td></td>
      <td style="text-align: right; line-height: 1.8;">
        <span>Ref: _______________</span><br/>
        <span>${ctx.date ?? formatDate()}</span>
      </td>
    </tr>
  </table>

  <!-- Body -->
  <p data-field="body" style="font-size: 13px; min-height: 200px; line-height: 1.8;">
    Begin typing your draft here...
  </p>

</div>
`;

// ── Exports ───────────────────────────────────────────────────────────────────

export const getDocumentTemplate = (
  type: TemplateType,
  ctx: TemplateContext = {}
): string => {
  switch (type) {
    case 'memo':   return memoTemplate(ctx);
    case 'letter': return letterTemplate(ctx);
    case 'draft':  return draftTemplate(ctx);
  }
};