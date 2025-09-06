import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Clock, MapPin, Check, X, CalendarPlus, MessageSquare } from "lucide-react";
import { fr } from "date-fns/locale";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Listing, Appointment } from "@shared/schema";

const appointmentSchema = z.object({
  appointmentDate: z.date(),
  duration: z.number().min(15).max(480),
  location: z.string().optional(),
  notes: z.string().optional(),
});

const appointmentResponseSchema = z.object({
  status: z.enum(["confirmed", "cancelled"]),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;
type AppointmentResponseFormData = z.infer<typeof appointmentResponseSchema>;

interface AppointmentManagerProps {
  listing: Listing;
}

export default function AppointmentManager({ listing }: AppointmentManagerProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");
  const [responseAppointmentId, setResponseAppointmentId] = useState<string | null>(null);

  // Formulaire pour planifier un rendez-vous
  const appointmentForm = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      duration: 60,
      location: listing.location || "",
      notes: "",
    },
  });

  // Formulaire pour répondre à un rendez-vous
  const responseForm = useForm<AppointmentResponseFormData>({
    resolver: zodResolver(appointmentResponseSchema),
    defaultValues: {
      status: "confirmed",
      notes: "",
    },
  });

  // Récupération des rendez-vous pour cette annonce
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments/listing", listing.id],
    queryFn: () => apiRequest("GET", `/api/appointments/listing/${listing.id}`),
    enabled: !!listing.id && !!user,
  });

  // Générer les créneaux horaires de 8h à 20h toutes les 30 minutes
  const timeSlots = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(timeString);
    }
  }

  // Mutation pour créer un rendez-vous
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData & { selectedTime: string }) => {
      const [hours, minutes] = data.selectedTime.split(':').map(Number);
      const appointmentDateTime = new Date(data.appointmentDate);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      return await apiRequest("POST", "/api/appointments", {
        listingId: listing.id,
        sellerId: listing.userId,
        appointmentDate: appointmentDateTime.toISOString(),
        duration: data.duration,
        location: data.location,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      toast({
        title: "Rendez-vous demandé !",
        description: "Votre demande de rendez-vous a été envoyée au vendeur.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/listing", listing.id] });
      setIsScheduleModalOpen(false);
      appointmentForm.reset();
      setSelectedTime("");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session expirée",
          description: "Vous êtes déconnecté. Reconnexion...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erreur",
        description: "Impossible de créer le rendez-vous. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  // Mutation pour répondre à un rendez-vous
  const respondAppointmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AppointmentResponseFormData }) => {
      return await apiRequest("PUT", `/api/appointments/${id}`, {
        status: data.status,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      toast({
        title: "Réponse envoyée !",
        description: "Votre réponse a été envoyée à l'acheteur.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/listing", listing.id] });
      setResponseAppointmentId(null);
      responseForm.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session expirée",
          description: "Vous êtes déconnecté. Reconnexion...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la réponse. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  const onSubmitAppointment = (data: AppointmentFormData) => {
    if (!isAuthenticated) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour planifier un rendez-vous.",
        variant: "destructive",
      });
      return;
    }

    if (user?.id === listing.userId) {
      toast({
        title: "Action non autorisée",
        description: "Vous ne pouvez pas planifier un rendez-vous avec vous-même.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTime) {
      toast({
        title: "Heure requise",
        description: "Veuillez sélectionner une heure pour le rendez-vous.",
        variant: "destructive",
      });
      return;
    }

    createAppointmentMutation.mutate({ ...data, selectedTime });
  };

  const onSubmitResponse = (data: AppointmentResponseFormData) => {
    if (!responseAppointmentId) return;
    respondAppointmentMutation.mutate({ id: responseAppointmentId, data });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case "confirmed":
        return <Badge variant="outline" className="text-green-600 border-green-300"><Check className="w-3 h-3 mr-1" />Confirmé</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="text-red-600 border-red-300"><X className="w-3 h-3 mr-1" />Annulé</Badge>;
      case "completed":
        return <Badge variant="outline" className="text-blue-600 border-blue-300"><Check className="w-3 h-3 mr-1" />Terminé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOwner = user && listing.userId === user.id;
  const hasPendingAppointment = appointments.some(a => a.buyerId === user?.id && a.status === "pending");

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Bouton pour planifier un rendez-vous - seulement pour les non-propriétaires */}
      {!isOwner && (
        <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
          <DialogTrigger asChild>
            <Button 
              className="w-full" 
              variant="outline" 
              disabled={hasPendingAppointment}
              data-testid="schedule-appointment-button"
            >
              <CalendarPlus className="w-4 h-4 mr-2" />
              {hasPendingAppointment ? "Rendez-vous en attente" : "Planifier un rendez-vous"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" data-testid="appointment-calendar-modal">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Planifier un rendez-vous
              </DialogTitle>
              <DialogDescription>
                Proposez un créneau pour rencontrer le vendeur
              </DialogDescription>
            </DialogHeader>
            
            <Form {...appointmentForm}>
              <form onSubmit={appointmentForm.handleSubmit(onSubmitAppointment)} className="space-y-6">
                {/* Informations sur le produit */}
                {listing && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-1">{listing.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{listing.price} TND</p>
                    {listing.location && (
                      <p className="text-sm text-gray-500 flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {listing.location}
                      </p>
                    )}
                  </div>
                )}

                {/* Sélection de la date */}
                <FormField
                  control={appointmentForm.control}
                  name="appointmentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date du rendez-vous</FormLabel>
                      <FormControl>
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={fr}
                          disabled={{ before: new Date() }}
                          className="rounded-md border"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Sélection de l'heure */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Heure du rendez-vous</label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger data-testid="time-selector">
                      <SelectValue placeholder="Sélectionner une heure" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time} data-testid={`time-${time}`}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Durée */}
                <FormField
                  control={appointmentForm.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Durée (minutes)
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                          <SelectTrigger data-testid="duration-selector">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="60">1 heure</SelectItem>
                            <SelectItem value="90">1h30</SelectItem>
                            <SelectItem value="120">2 heures</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Lieu */}
                <FormField
                  control={appointmentForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        Lieu de rendez-vous (optionnel)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={listing.location || "Adresse ou lieu de rencontre"}
                          data-testid="location-input"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={appointmentForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        Notes (optionnel)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ajoutez des informations supplémentaires..."
                          rows={3}
                          data-testid="appointment-notes"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsScheduleModalOpen(false)}
                    data-testid="cancel-appointment"
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createAppointmentMutation.isPending}
                    data-testid="schedule-appointment"
                  >
                    {createAppointmentMutation.isPending ? "Envoi..." : "Planifier le rendez-vous"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Liste des rendez-vous */}
      {appointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Rendez-vous ({appointments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatDateTime(appointment.appointmentDate)}
                      </span>
                      {getStatusBadge(appointment.status)}
                    </div>
                    <p className="text-sm text-gray-600">
                      Durée : {appointment.duration} minutes
                    </p>
                    {appointment.location && (
                      <p className="text-sm text-gray-600 flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {appointment.location}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(appointment.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {appointment.notes && (
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-700">{appointment.notes}</p>
                  </div>
                )}

                {/* Actions pour le vendeur */}
                {isOwner && appointment.status === "pending" && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setResponseAppointmentId(appointment.id);
                        respondAppointmentMutation.mutate({
                          id: appointment.id,
                          data: { status: "confirmed" }
                        });
                      }}
                      disabled={respondAppointmentMutation.isPending}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Confirmer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setResponseAppointmentId(appointment.id);
                        respondAppointmentMutation.mutate({
                          id: appointment.id,
                          data: { status: "cancelled" }
                        });
                      }}
                      disabled={respondAppointmentMutation.isPending}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Annuler
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}