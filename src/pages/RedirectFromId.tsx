// src/pages/RedirectFromId.tsx
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Loader2 } from 'lucide-react';

export default function RedirectFromId() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSlug = async () => {
      if (!id) {
        navigate('/events', { replace: true });
        return;
      }
      
      try {
        const { data } = await supabase
          .from("events")
          .select("slug")
          .eq("id", id)
          .single();

        if (data?.slug) {
          // Redirect to the slug URL
          navigate(`/event/${data.slug}`, { replace: true });
        } else {
          // If no slug found, try to show the event with ID
          // (EventDetails component can handle IDs as fallback)
          navigate(`/event/${id}`, { replace: true });
        }
      } catch (err) {
        console.error("Error fetching slug:", err);
        // Redirect to events page on error
        navigate('/events', { replace: true });
      }
    };
    
    fetchSlug();
  }, [id, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto" />
        <p className="text-gray-600">Redirecting to event page...</p>
      </div>
    </div>
  );
}