import PublicSurveyForm from "./PublicSurveyForm";


/**
 * Deliberately does not touch the Redux store or any admin-only code —
 * this page is the entire public bundle (see the Vite multi-entry setup).
 */
const SURVEY_SLUG = 'milimani-high-court-divisions-units-refurbishment-needs-assessment-form';

export default function PublicSurveyPage() {
  return (
    <div className="public-survey-page">
      <PublicSurveyForm slug={SURVEY_SLUG} />
    </div>
  );
}