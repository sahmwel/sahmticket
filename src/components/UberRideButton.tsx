'use client';

import { Car, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface UberRideButtonProps {
  location: string;
  address?: string;
  lat?: number;
  lng?: number;
  eventTitle?: string;
}

export default function UberRideButton({ 
  location, 
  address, 
  lat, 
  lng,
  eventTitle = "Event"
}: UberRideButtonProps) {
  const [showOptions, setShowOptions] = useState(false);
  
  // Build Uber URL based on available data
  const getUberUrl = () => {
    const fullAddress = address || location;
    
    if (lat && lng) {
      // Best: Use coordinates
      return `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(fullAddress)}&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}&dropoff[nickname]=${encodeURIComponent(eventTitle)}`;
    } else {
      // Fallback: Use address only
      return `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(fullAddress)}&dropoff[nickname]=${encodeURIComponent(eventTitle)}`;
    }
  };
  
  // Uber Ride Estimate URL
  const getUberEstimateUrl = () => {
    const fullAddress = address || location;
    
    if (lat && lng) {
      return `https://www.uber.com/ride/estimate/?pickupAddress=Current%20Location&destinationAddress=${encodeURIComponent(fullAddress)}&destinationLat=${lat}&destinationLng=${lng}`;
    } else {
      return `https://www.uber.com/ride/estimate/?pickupAddress=Current%20Location&destinationAddress=${encodeURIComponent(fullAddress)}`;
    }
  };
  
  // Uber App Deep Link (for mobile)
  const getUberDeepLink = () => {
    const fullAddress = address || location;
    
    if (lat && lng) {
      return `uber://?action=setDropoff&dropoff[formatted_address]=${encodeURIComponent(fullAddress)}&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}&dropoff[nickname]=${encodeURIComponent(eventTitle)}`;
    } else {
      return `uber://?action=setDropoff&dropoff[formatted_address]=${encodeURIComponent(fullAddress)}&dropoff[nickname]=${encodeURIComponent(eventTitle)}`;
    }
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
        </svg>
        Get Uber Ride
      </button>
      
      {/* Dropdown Options */}
      {showOptions && (
        <div className="absolute bottom-full mb-2 right-0 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 min-w-[280px] z-50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">Uber Options</span>
              <button 
                onClick={() => setShowOptions(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <a
              href={getUberUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Request Ride</p>
                  <p className="text-sm text-gray-600">Open Uber app/website</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
            
            <a
              href={getUberEstimateUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">₦</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900">Check Fare</p>
                  <p className="text-sm text-gray-600">Get price estimate</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
            
            <a
              href={getUberDeepLink()}
              className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
              onClick={(e) => {
                // Try deep link first, fallback to web
                e.preventDefault();
                window.location.href = getUberDeepLink();
                setTimeout(() => {
                  window.location.href = getUberUrl();
                }, 250);
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.707 12.293a.999.999 0 00-1.414 0L13 15.586V8a1 1 0 10-2 0v7.586l-3.293-3.293a.999.999 0 10-1.414 1.414l5 5a.999.999 0 001.414 0l5-5a.999.999 0 000-1.414z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-gray-900">Open in Uber App</p>
                  <p className="text-sm text-gray-600">Direct app launch</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
            
            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Uber availability varies by location. You'll need the Uber app installed for best experience.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}