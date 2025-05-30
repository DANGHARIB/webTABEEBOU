import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../../contexts/AuthContext';
import './PatientAssessment.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Interfaces
interface Question {
  _id: string;
  id: number; // Assuming 'id' might be a numeric identifier if present, otherwise _id is primary
  questionText: string;
  type: 'YesNo' | 'MultiChoice' | 'Text';
  options?: MultiChoiceOption[] | string; // string for legacy comma-separated, MultiChoiceOption[] for new
  scoring: Record<string, string>; // Or any more specific type if known
}

interface PatientResponseItem {
  questionId: string;
  response: string | string[];
}

interface MultiChoiceOption {
  key: string;
  label: string;
}

const PatientAssessment: React.FC = () => {
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<PatientResponseItem[]>([]);
  const [currentTextResponse, setCurrentTextResponse] = useState('');
  const [currentMultiChoiceResponse, setCurrentMultiChoiceResponse] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchAssessmentQuestions = async () => {
      const token = localStorage.getItem('token');
      if (!token || !authContext) {
        setError("User not authenticated. Please log in again.");
        setLoading(false);
        navigate('/patient/auth/login'); // Redirect to login if no token
        return;
      }
      setLoading(true);
      setError(null);
      try {
        console.log("Fetching assessment questions...");
        const response = await axios.get(`${API_URL}/questions/assessment`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        console.log("Assessment API response:", response.data);

        if (response.data.hasAnswered) {
          console.log("User has already answered assessment questions");
          // Update context if necessary, though login should handle this
          if (authContext.user && !authContext.user.hasCompletedAssessment && authContext.setAuthenticatedUserManually) {
            const currentToken = localStorage.getItem('token'); // Re-fetch token for safety
            if (currentToken) {
              authContext.setAuthenticatedUserManually(currentToken, { ...authContext.user, hasCompletedAssessment: true }, authContext.user.role);
            }
          }
          navigate('/patient'); // Navigate to patient dashboard
          return;
        }
        
        if (response.data.questions && response.data.questions.length > 0) {
          setQuestions(response.data.questions);
        } else {
          setError("No assessment questions found. Please contact support.");
        }
      } catch (err: unknown) {
        console.error("Error loading questions:", err);
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.message || "Error loading questions. Please try again.");
        } else {
          setError("An unexpected error occurred while loading questions.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAssessmentQuestions();
  }, [authContext, navigate]);

  const submitResponsesApi = async (finalResponses: PatientResponseItem[]) => {
    const token = localStorage.getItem('token');
    if (!token || !authContext) {
      setError("User not authenticated. Cannot submit responses.");
      return { success: false, message: "Missing token" };
    }
    setIsSubmitting(true);
    setError(null);
    try {
      console.log("Submitting responses:", finalResponses);
      await axios.post(
        `${API_URL}/questions/submit-responses`,
        { responses: finalResponses },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Fetch updated profile to refresh user state, including hasCompletedAssessment
      try {
        const profileResponse = await axios.get(`${API_URL}/patients/profile`, {
          headers: {
            Authorization: `Bearer ${token}` // Use the token fetched at the start of the function
          }
        });
        if (profileResponse.data && authContext.setAuthenticatedUserManually && authContext.user) {
          const updatedUserData = { 
            ...authContext.user, 
            ...profileResponse.data, 
            hasCompletedAssessment: true 
          };
          // The token is already in localStorage, setAuthenticatedUserManually will re-set it if needed
          // and update the user state in context.
          authContext.setAuthenticatedUserManually(token, updatedUserData, authContext.user.role);
          // localStorage.setItem('currentUser', JSON.stringify(updatedUserData)); // AuthContext handles this now via setAuthenticatedUserManually
        }
      } catch (profileError: unknown) {
        console.error("Error fetching updated profile after assessment:", profileError);
        // Non-critical, proceed with navigation
      }

      return { success: true };
    } catch (err: unknown) {
      console.error("Error submitting responses:", err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Error submitting responses. Please try again.");
        return { success: false, message: err.response?.data?.message || "Unknown error during submission" };
      } else {
        setError("An unexpected error occurred during submission.");
        return { success: false, message: "An unexpected error occurred" };
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (questions.length === 0) return;
    const currentQuestion = questions[currentQuestionIndex];
    let responseValue: string | string[];

    if (currentQuestion.type === 'Text') {
      responseValue = currentTextResponse;
    } else if (currentQuestion.type === 'YesNo') {
      responseValue = currentTextResponse; // 'Yes' or 'No'
    } else if (currentQuestion.type === 'MultiChoice') {
      responseValue = currentMultiChoiceResponse;
    } else {
      responseValue = '';
    }

    const newResponse: PatientResponseItem = {
      questionId: currentQuestion._id,
      response: responseValue,
    };
    
    const updatedResponses = [...responses, newResponse];
    setResponses(updatedResponses);

    setCurrentTextResponse('');
    setCurrentMultiChoiceResponse('');

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmit(updatedResponses);
    }
  };

  const handleSubmit = async (finalResponses: PatientResponseItem[]) => {
    const result = await submitResponsesApi(finalResponses);
    if (result.success) {
      navigate('/patient'); // Navigate to patient dashboard or a confirmation page
    }
  };
  
  const handleYesNoResponse = (response: 'Yes' | 'No') => {
    setCurrentTextResponse(response);
  };

  const handleMultiChoiceResponse = (key: string) => {
    setCurrentMultiChoiceResponse(key);
  };

  const renderMultiChoiceOptions = (question: Question) => {
    if (Array.isArray(question.options) && question.options.length > 0 && typeof question.options[0] === 'object' && 'key' in question.options[0] && 'label' in question.options[0]) {
      return (question.options as MultiChoiceOption[]).map((option) => (
        <button
          key={option.key}
          className={`choice-button ${currentMultiChoiceResponse === option.key ? 'selected' : ''}`}
          onClick={() => handleMultiChoiceResponse(option.key)}
        >
          {option.label}
        </button>
      ));
    } 
    // Fallback for string-based options (though interface implies MultiChoiceOption[])
    else if (typeof question.options === 'string') {
      return question.options.split(',').map((option, index) => {
        const trimmedOption = option.trim();
        return (
          <button
            key={index}
            className={`choice-button ${currentMultiChoiceResponse === trimmedOption ? 'selected' : ''}`}
            onClick={() => handleMultiChoiceResponse(trimmedOption)}
          >
            {trimmedOption}
          </button>
        );
      });
    }
    return <p className="error-text">No options available for this question</p>;
  };

  if (loading && questions.length === 0) {
    return (
      <div className="assessment-wrapper centered-container">
        <div className="spinner"></div>
        <p className="loading-text">Loading questions...</p>
      </div>
    );
  }

  if (error && !isSubmitting) { // Don't show general error if submission error is shown by submit button area
    return (
      <div className="assessment-wrapper centered-container">
        <p className="error-text">{error}</p>
        <button className="action-button" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (questions.length === 0 && !loading) {
    return (
      <div className="assessment-wrapper centered-container">
        <p className="info-text">No questions to display, or you have already answered.</p>
        <button className="action-button" onClick={() => navigate('/patient')}>Go to Dashboard</button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = `${currentQuestionIndex + 1}/${questions.length}`;

  const isNextButtonDisabled = () => {
    if (isSubmitting) return true;
    if (currentQuestion.type === 'Text' && !currentTextResponse.trim()) return true;
    if (currentQuestion.type === 'YesNo' && !currentTextResponse) return true;
    if (currentQuestion.type === 'MultiChoice' && !currentMultiChoiceResponse) return true;
    return false;
  };

  return (
    <div className="assessment-wrapper">
      <div className="assessment-content-container">
        <h1 className="main-title">Basic Assessment</h1>
        <p className="sub-title">to match you with the Best Doctor and Create your Profile</p>
        <p className="progress-text">Question {progress}</p>
        
        {currentQuestion && (
          <div className="question-wrapper">
            <p className="question-label">Question {currentQuestionIndex + 1}</p>
            <p className="question-text">{currentQuestion.questionText}</p>
            
            {currentQuestion.type === 'Text' && (
              <textarea
                className="text-input"
                placeholder={`Your answer here...`}
                value={currentTextResponse}
                onChange={(e) => setCurrentTextResponse(e.target.value)}
                rows={4}
              />
            )}

            {currentQuestion.type === 'YesNo' && (
              <div className="yes-no-container">
                <button 
                  className={`choice-button ${currentTextResponse === 'Yes' ? 'selected' : ''}`}
                  onClick={() => { handleYesNoResponse('Yes'); }}>
                  Yes
                </button>
                <button 
                  className={`choice-button ${currentTextResponse === 'No' ? 'selected' : ''}`}
                  onClick={() => { handleYesNoResponse('No'); }}>
                  No
                </button>
              </div>
            )}

            {currentQuestion.type === 'MultiChoice' && (
              <div className="multi-choice-container">
                {renderMultiChoiceOptions(currentQuestion)}
              </div>
            )}
          </div>
        )}

        {error && isSubmitting && <p className="error-text submit-error">{error}</p>}

        <button
          className={`action-button ${isNextButtonDisabled() ? 'disabled' : ''}`}
          onClick={handleNextQuestion}
          disabled={isNextButtonDisabled()}
        >
          {isSubmitting ? 
            <div className="spinner button-spinner"></div> :
            (currentQuestionIndex < questions.length - 1 ? 'Next' : 'Submit')
          }
        </button>
      </div>
    </div>
  );
};

export default PatientAssessment;
