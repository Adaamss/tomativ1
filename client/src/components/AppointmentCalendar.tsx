import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";
import { fr } from "date-fns/locale";
import { format } from "date-fns";
import type { Listing } from "@shared/schema";

interface AppointmentCalendarProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing | null;
  sellerId: string;
  onSchedule: (appointmentData: {
    date: Date;
    time: string;
    duration: number;
    location: string;
    notes: string;
  }) => void;
}

export default function AppointmentCalendar({
  isOpen,
  onClose,
  listing,
  sellerId,
  onSchedule
}: AppointmentCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  // Generate time slots from 8:00 to 20:00 every 30 minutes
  const timeSlots = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(timeString);
    }
  }

  const handleSchedule = () => {
    if (!selectedDate || !selectedTime) return;

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const appointmentDateTime = new Date(selectedDate);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    onSchedule({
      date: appointmentDateTime,
      time: selectedTime,
      duration,
      location,
      notes
    });

    // Reset form
    setSelectedDate(undefined);
    setSelectedTime("");
    setDuration(60);
    setLocation("");
    setNotes("");
    onClose();
  };

  // Disable past dates
  const disabledDays = {
    before: new Date()
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" data-testid="appointment-calendar-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center text-lg">
            <CalendarIcon className="w-5 h-5 mr-2 text-primary" />
            Planifier un rendez-vous
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Product Info */}
          {listing && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-1">{listing.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{listing.price} {listing.currency}</p>
              {listing.location && (
                <p className="text-sm text-gray-500 flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  {listing.location}
                </p>
              )}
            </div>
          )}

          {/* Calendar Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Sélectionner une date</Label>
            <div className="border rounded-lg p-3">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={disabledDays}
                locale={fr}
                className="w-full"
                data-testid="appointment-calendar"
              />
            </div>
          </div>

          {/* Time Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Heure du rendez-vous
            </Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger data-testid="time-select">
                <SelectValue placeholder="Choisir l'heure" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Durée (minutes)</Label>
            <Select value={duration.toString()} onValueChange={(value) => setDuration(Number(value))}>
              <SelectTrigger data-testid="duration-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 heure</SelectItem>
                <SelectItem value="90">1h30</SelectItem>
                <SelectItem value="120">2 heures</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              Lieu de rendez-vous
            </Label>
            <Input
              placeholder="Adresse ou lieu de rencontre"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              data-testid="location-input"
            />
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Notes (optionnel)</Label>
            <Textarea
              placeholder="Informations supplémentaires..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              data-testid="notes-textarea"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
              data-testid="cancel-appointment"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={!selectedDate || !selectedTime}
              className="flex-1"
              style={{ backgroundColor: '#f14247' }}
              data-testid="schedule-appointment"
            >
              Planifier le rendez-vous
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}