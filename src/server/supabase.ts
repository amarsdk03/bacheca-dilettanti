export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      annuncio: {
        Row: {
          autore_annuncio: string | null
          creato_da: string | null
          creato_il: string | null
          info_stato_annuncio: string | null
          livello_annuncio: string | null
          nascosto: boolean | null
          priorita_attiva: boolean
          priorita_fine_il: string | null
          priorita_inizio_il: string | null
          privato: boolean | null
          stato_annuncio: string | null
          titolo_annuncio: string | null
          tipologia_annuncio: string
          ultima_modifica_da: string | null
          ultima_modifica_il: string | null
          uuid: string
        }
        Insert: {
          autore_annuncio?: string | null
          creato_da?: string | null
          creato_il?: string | null
          info_stato_annuncio?: string | null
          livello_annuncio?: string | null
          nascosto?: boolean | null
          priorita_attiva?: boolean
          priorita_fine_il?: string | null
          priorita_inizio_il?: string | null
          privato?: boolean | null
          stato_annuncio?: string | null
          titolo_annuncio?: string | null
          tipologia_annuncio: string
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
          uuid?: string
        }
        Update: {
          autore_annuncio?: string | null
          creato_da?: string | null
          creato_il?: string | null
          info_stato_annuncio?: string | null
          livello_annuncio?: string | null
          nascosto?: boolean | null
          priorita_attiva?: boolean
          priorita_fine_il?: string | null
          priorita_inizio_il?: string | null
          privato?: boolean | null
          stato_annuncio?: string | null
          titolo_annuncio?: string | null
          tipologia_annuncio?: string
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "annuncio_autore_annuncio_fkey"
            columns: ["autore_annuncio"]
            isOneToOne: false
            referencedRelation: "profilo"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "annuncio_creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "utente"
            referencedColumns: ["utente_uuid"]
          },
          {
            foreignKeyName: "annuncio_ultima_modifica_da_fkey"
            columns: ["ultima_modifica_da"]
            isOneToOne: false
            referencedRelation: "utente"
            referencedColumns: ["utente_uuid"]
          },
        ]
      }
      annuncio_arbitro: {
        Row: {
          automunito: string | null
          categorie_ricercate: string[] | null
          descrizione_aggiuntiva: string | null
          disponibilita_occupazione: string | null
          disponibilita_spostamento: string | null
          info_mostrate: Json | null
          lista_esperienze: Json | null
          qualifiche_licenze: Json
          tipologie_sport: string[] | null
          uuid_annuncio: string
        }
        Insert: {
          automunito?: string | null
          categorie_ricercate?: string[] | null
          descrizione_aggiuntiva?: string | null
          disponibilita_occupazione?: string | null
          disponibilita_spostamento?: string | null
          info_mostrate?: Json | null
          lista_esperienze?: Json | null
          qualifiche_licenze?: Json
          tipologie_sport?: string[] | null
          uuid_annuncio: string
        }
        Update: {
          automunito?: string | null
          categorie_ricercate?: string[] | null
          descrizione_aggiuntiva?: string | null
          disponibilita_occupazione?: string | null
          disponibilita_spostamento?: string | null
          info_mostrate?: Json | null
          lista_esperienze?: Json | null
          qualifiche_licenze?: Json
          tipologie_sport?: string[] | null
          uuid_annuncio?: string
        }
        Relationships: [
          {
            foreignKeyName: "annuncio_arbitro_uuid_annuncio_fkey"
            columns: ["uuid_annuncio"]
            isOneToOne: true
            referencedRelation: "annuncio"
            referencedColumns: ["uuid"]
          },
        ]
      }
      annuncio_campo_impianto: {
        Row: {
          costo_partenza: number | null
          descrizione_aggiuntiva: string | null
          indirizzo: string | null
          info_mostrate: Json | null
          orari: Json | null
          servizi_inclusi: string | null
          tipologie_sport: string[] | null
          uuid_annuncio: string
        }
        Insert: {
          costo_partenza?: number | null
          descrizione_aggiuntiva?: string | null
          indirizzo?: string | null
          info_mostrate?: Json | null
          orari?: Json | null
          servizi_inclusi?: string | null
          tipologie_sport?: string[] | null
          uuid_annuncio: string
        }
        Update: {
          costo_partenza?: number | null
          descrizione_aggiuntiva?: string | null
          indirizzo?: string | null
          info_mostrate?: Json | null
          orari?: Json | null
          servizi_inclusi?: string | null
          tipologie_sport?: string[] | null
          uuid_annuncio?: string
        }
        Relationships: [
          {
            foreignKeyName: "annuncio_campo_impianto_uuid_annuncio_fkey"
            columns: ["uuid_annuncio"]
            isOneToOne: true
            referencedRelation: "annuncio"
            referencedColumns: ["uuid"]
          },
        ]
      }
      annuncio_creator: {
        Row: {
          contenuto_post: string | null
          descrizione_aggiuntiva: string | null
          descrizione_post: string | null
          info_mostrate: Json | null
          titolo_post: string | null
          uuid_annuncio: string
        }
        Insert: {
          contenuto_post?: string | null
          descrizione_aggiuntiva?: string | null
          descrizione_post?: string | null
          info_mostrate?: Json | null
          titolo_post?: string | null
          uuid_annuncio: string
        }
        Update: {
          contenuto_post?: string | null
          descrizione_aggiuntiva?: string | null
          descrizione_post?: string | null
          info_mostrate?: Json | null
          titolo_post?: string | null
          uuid_annuncio?: string
        }
        Relationships: [
          {
            foreignKeyName: "annuncio_creator_uuid_annuncio_fkey"
            columns: ["uuid_annuncio"]
            isOneToOne: true
            referencedRelation: "annuncio"
            referencedColumns: ["uuid"]
          },
        ]
      }
      annuncio_generico: {
        Row: {
          contenuto: string | null
          titolo: string
          uuid_annuncio: string
        }
        Insert: {
          contenuto?: string | null
          titolo: string
          uuid_annuncio: string
        }
        Update: {
          contenuto?: string | null
          titolo?: string
          uuid_annuncio?: string
        }
        Relationships: [
          {
            foreignKeyName: "annuncio_generico_uuid_annuncio_fkey"
            columns: ["uuid_annuncio"]
            isOneToOne: true
            referencedRelation: "annuncio"
            referencedColumns: ["uuid"]
          },
        ]
      }
      annuncio_giocatore: {
        Row: {
          categorie_ricercate: string[] | null
          descrizione_aggiuntiva: string | null
          info_mostrate: Json | null
          ruoli_principali: string[] | null
          ruoli_secondari: string[] | null
          tipologie_sport: string[] | null
          uuid_annuncio: string
        }
        Insert: {
          categorie_ricercate?: string[] | null
          descrizione_aggiuntiva?: string | null
          info_mostrate?: Json | null
          ruoli_principali?: string[] | null
          ruoli_secondari?: string[] | null
          tipologie_sport?: string[] | null
          uuid_annuncio: string
        }
        Update: {
          categorie_ricercate?: string[] | null
          descrizione_aggiuntiva?: string | null
          info_mostrate?: Json | null
          ruoli_principali?: string[] | null
          ruoli_secondari?: string[] | null
          tipologie_sport?: string[] | null
          uuid_annuncio?: string
        }
        Relationships: [
          {
            foreignKeyName: "annuncio_giocatore_uuid_annuncio_fkey"
            columns: ["uuid_annuncio"]
            isOneToOne: true
            referencedRelation: "annuncio"
            referencedColumns: ["uuid"]
          },
        ]
      }
      annuncio_servizi_consulenze: {
        Row: {
          automunito: string | null
          descrizione_aggiuntiva: string | null
          figura_professionale: string[] | null
          info_mostrate: Json | null
          lista_esperienze: Json | null
          qualifiche_licenze: Json
          presentazione_servizi: string | null
          specializzazione: string | null
          tipologie_sport: Json | null
          uuid_annuncio: string
        }
        Insert: {
          automunito?: string | null
          descrizione_aggiuntiva?: string | null
          figura_professionale?: string[] | null
          info_mostrate?: Json | null
          lista_esperienze?: Json | null
          qualifiche_licenze?: Json
          presentazione_servizi?: string | null
          specializzazione?: string | null
          tipologie_sport?: Json | null
          uuid_annuncio: string
        }
        Update: {
          automunito?: string | null
          descrizione_aggiuntiva?: string | null
          figura_professionale?: string[] | null
          info_mostrate?: Json | null
          lista_esperienze?: Json | null
          qualifiche_licenze?: Json
          presentazione_servizi?: string | null
          specializzazione?: string | null
          tipologie_sport?: Json | null
          uuid_annuncio?: string
        }
        Relationships: [
          {
            foreignKeyName: "annuncio_servizi_consulenze_uuid_annuncio_fkey"
            columns: ["uuid_annuncio"]
            isOneToOne: true
            referencedRelation: "annuncio"
            referencedColumns: ["uuid"]
          },
        ]
      }
      annuncio_salvato: {
        Row: {
          salvato_il: string
          uuid_annuncio: string
          uuid_utente: string
        }
        Insert: {
          salvato_il?: string
          uuid_annuncio: string
          uuid_utente: string
        }
        Update: {
          salvato_il?: string
          uuid_annuncio?: string
          uuid_utente?: string
        }
        Relationships: [
          {
            foreignKeyName: "annuncio_salvato_uuid_annuncio_fkey"
            columns: ["uuid_annuncio"]
            isOneToOne: false
            referencedRelation: "annuncio"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "annuncio_salvato_uuid_utente_fkey"
            columns: ["uuid_utente"]
            isOneToOne: false
            referencedRelation: "utente"
            referencedColumns: ["utente_uuid"]
          },
        ]
      }
      annuncio_squadra_cerca_giocatore: {
        Row: {
          gruppo_squadra: string | null
          annata_da: number | null
          annata_a: number | null
          annate_ricercate: string[] | null
          descrizione_aggiuntiva: string | null
          info_mostrate: Json | null
          ruoli_principali: string[] | null
          ruoli_secondari: string[] | null
          stagione: string | null
          tipologie_sport: string[] | null
          uuid_annuncio: string
        }
        Insert: {
          gruppo_squadra?: string | null
          annata_da?: number | null
          annata_a?: number | null
          annate_ricercate?: string[] | null
          descrizione_aggiuntiva?: string | null
          info_mostrate?: Json | null
          ruoli_principali?: string[] | null
          ruoli_secondari?: string[] | null
          stagione?: string | null
          tipologie_sport?: string[] | null
          uuid_annuncio: string
        }
        Update: {
          gruppo_squadra?: string | null
          annata_da?: number | null
          annata_a?: number | null
          annate_ricercate?: string[] | null
          descrizione_aggiuntiva?: string | null
          info_mostrate?: Json | null
          ruoli_principali?: string[] | null
          ruoli_secondari?: string[] | null
          stagione?: string | null
          tipologie_sport?: string[] | null
          uuid_annuncio?: string
        }
        Relationships: [
          {
            foreignKeyName: "annuncio_squadra_cerca_giocatore_uuid_annuncio_fkey"
            columns: ["uuid_annuncio"]
            isOneToOne: true
            referencedRelation: "annuncio"
            referencedColumns: ["uuid"]
          },
        ]
      }
      annuncio_squadra_cerca_partita: {
        Row: {
          gruppo_squadra: string | null
          categorie_avversario: string[] | null
          descrizione_aggiuntiva: string | null
          disponibilita_trasferta: string | null
          info_mostrate: Json | null
          orario_alle: string | null
          orario_dalle: string | null
          periodo_al: string | null
          periodo_dal: string | null
          uuid_annuncio: string
        }
        Insert: {
          gruppo_squadra?: string | null
          categorie_avversario?: string[] | null
          descrizione_aggiuntiva?: string | null
          disponibilita_trasferta?: string | null
          info_mostrate?: Json | null
          orario_alle?: string | null
          orario_dalle?: string | null
          periodo_al?: string | null
          periodo_dal?: string | null
          uuid_annuncio: string
        }
        Update: {
          gruppo_squadra?: string | null
          categorie_avversario?: string[] | null
          descrizione_aggiuntiva?: string | null
          disponibilita_trasferta?: string | null
          info_mostrate?: Json | null
          orario_alle?: string | null
          orario_dalle?: string | null
          periodo_al?: string | null
          periodo_dal?: string | null
          uuid_annuncio?: string
        }
        Relationships: [
          {
            foreignKeyName: "annuncio_squadra_cerca_partita_uuid_annuncio_fkey"
            columns: ["uuid_annuncio"]
            isOneToOne: true
            referencedRelation: "annuncio"
            referencedColumns: ["uuid"]
          },
        ]
      }
      annuncio_squadra_cerca_sponsor: {
        Row: {
          categoria_settore: string | null
          descrizione_aggiuntiva: string | null
          info_mostrate: Json | null
          offerta_fornita: string | null
          supporto_cercato: string | null
          uuid_annuncio: string
        }
        Insert: {
          categoria_settore?: string | null
          descrizione_aggiuntiva?: string | null
          info_mostrate?: Json | null
          offerta_fornita?: string | null
          supporto_cercato?: string | null
          uuid_annuncio: string
        }
        Update: {
          categoria_settore?: string | null
          descrizione_aggiuntiva?: string | null
          info_mostrate?: Json | null
          offerta_fornita?: string | null
          supporto_cercato?: string | null
          uuid_annuncio?: string
        }
        Relationships: [
          {
            foreignKeyName: "annuncio_squadra_cerca_sponsor_uuid_annuncio_fkey"
            columns: ["uuid_annuncio"]
            isOneToOne: true
            referencedRelation: "annuncio"
            referencedColumns: ["uuid"]
          },
        ]
      }
      annuncio_squadra_cerca_staff: {
        Row: {
          compenso_mensile: number | null
          descrizione_aggiuntiva: string | null
          figura_ricercata: string | null
          figure_ricercate: string[] | null
          info_mostrate: Json | null
          periodo_al: string | null
          periodo_dal: string | null
          requisiti: string | null
          settore: string | null
          stagione: string | null
          uuid_annuncio: string
        }
        Insert: {
          compenso_mensile?: number | null
          descrizione_aggiuntiva?: string | null
          figura_ricercata?: string | null
          figure_ricercate?: string[] | null
          info_mostrate?: Json | null
          periodo_al?: string | null
          periodo_dal?: string | null
          requisiti?: string | null
          settore?: string | null
          stagione?: string | null
          uuid_annuncio: string
        }
        Update: {
          compenso_mensile?: number | null
          descrizione_aggiuntiva?: string | null
          figura_ricercata?: string | null
          figure_ricercate?: string[] | null
          info_mostrate?: Json | null
          periodo_al?: string | null
          periodo_dal?: string | null
          requisiti?: string | null
          settore?: string | null
          stagione?: string | null
          uuid_annuncio?: string
        }
        Relationships: [
          {
            foreignKeyName: "annuncio_squadra_cerca_staff_uuid_annuncio_fkey"
            columns: ["uuid_annuncio"]
            isOneToOne: true
            referencedRelation: "annuncio"
            referencedColumns: ["uuid"]
          },
        ]
      }
      annuncio_staff_sportivo: {
        Row: {
          categorie_ricercate: string[] | null
          descrizione_aggiuntiva: string | null
          disponibile_remoto: boolean
          disponibilita_occupazione: string | null
          disponibilita_spostamento: string | null
          figure_professionali: string[] | null
          info_mostrate: Json | null
          lista_esperienze: Json | null
          qualifiche_licenze: Json | null
          tipologie_sport: string[] | null
          uuid_annuncio: string
        }
        Insert: {
          categorie_ricercate?: string[] | null
          descrizione_aggiuntiva?: string | null
          disponibile_remoto?: boolean
          disponibilita_occupazione?: string | null
          disponibilita_spostamento?: string | null
          figure_professionali?: string[] | null
          info_mostrate?: Json | null
          lista_esperienze?: Json | null
          qualifiche_licenze?: Json | null
          tipologie_sport?: string[] | null
          uuid_annuncio: string
        }
        Update: {
          categorie_ricercate?: string[] | null
          descrizione_aggiuntiva?: string | null
          disponibile_remoto?: boolean
          disponibilita_occupazione?: string | null
          disponibilita_spostamento?: string | null
          figure_professionali?: string[] | null
          info_mostrate?: Json | null
          lista_esperienze?: Json | null
          qualifiche_licenze?: Json | null
          tipologie_sport?: string[] | null
          uuid_annuncio?: string
        }
        Relationships: [
          {
            foreignKeyName: "annuncio_staff_sportivo_uuid_annuncio_fkey"
            columns: ["uuid_annuncio"]
            isOneToOne: true
            referencedRelation: "annuncio"
            referencedColumns: ["uuid"]
          },
        ]
      }
      annuncio_torneo_evento: {
        Row: {
          annate_ammesse_a: string | null
          annate_ammesse_da: string | null
          costo_partecipazione: number | null
          descrizione_aggiuntiva: string | null
          info_mostrate: Json | null
          lista_premi_trofei: Json | null
          modalita_iscrizione: string | null
          nome_evento: string | null
          numero_squadre: number | null
          tipo_partecipazione: string | null
          tipologie_sport: string[] | null
          uuid_annuncio: string
        }
        Insert: {
          annate_ammesse_a?: string | null
          annate_ammesse_da?: string | null
          costo_partecipazione?: number | null
          descrizione_aggiuntiva?: string | null
          info_mostrate?: Json | null
          lista_premi_trofei?: Json | null
          modalita_iscrizione?: string | null
          nome_evento?: string | null
          numero_squadre?: number | null
          tipo_partecipazione?: string | null
          tipologie_sport?: string[] | null
          uuid_annuncio: string
        }
        Update: {
          annate_ammesse_a?: string | null
          annate_ammesse_da?: string | null
          costo_partecipazione?: number | null
          descrizione_aggiuntiva?: string | null
          info_mostrate?: Json | null
          lista_premi_trofei?: Json | null
          modalita_iscrizione?: string | null
          nome_evento?: string | null
          numero_squadre?: number | null
          tipo_partecipazione?: string | null
          tipologie_sport?: string[] | null
          uuid_annuncio?: string
        }
        Relationships: [
          {
            foreignKeyName: "annuncio_torneo_evento_uuid_annuncio_fkey"
            columns: ["uuid_annuncio"]
            isOneToOne: true
            referencedRelation: "annuncio"
            referencedColumns: ["uuid"]
          },
        ]
      }
      contatto_annuncio: {
        Row: {
          id: number
          tipo: string
          uuid_annuncio: string
          valore: string
          referente: string | null
        }
        Insert: {
          id?: number
          tipo: string
          uuid_annuncio: string
          valore: string
          referente?: string | null
        }
        Update: {
          id?: number
          tipo?: string
          uuid_annuncio?: string
          valore?: string
          referente?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contatto_annuncio_uuid_annuncio_fkey"
            columns: ["uuid_annuncio"]
            isOneToOne: false
            referencedRelation: "annuncio"
            referencedColumns: ["uuid"]
          },
        ]
      }
      invito: {
        Row: {
          codice_invito: string
          confermato_il: string | null
          considerato: boolean
          invito_uuid: string
          registrato_il: string
          uuid_invitante: string
          uuid_invitato: string
        }
        Insert: {
          codice_invito: string
          confermato_il?: string | null
          considerato?: boolean
          invito_uuid?: string
          registrato_il: string
          uuid_invitante: string
          uuid_invitato: string
        }
        Update: {
          codice_invito?: string
          confermato_il?: string | null
          considerato?: boolean
          invito_uuid?: string
          registrato_il?: string
          uuid_invitante?: string
          uuid_invitato?: string
        }
        Relationships: [
          {
            foreignKeyName: "invito_uuid_invitante_fkey"
            columns: ["uuid_invitante"]
            isOneToOne: false
            referencedRelation: "utente"
            referencedColumns: ["utente_uuid"]
          },
          {
            foreignKeyName: "invito_uuid_invitato_fkey"
            columns: ["uuid_invitato"]
            isOneToOne: true
            referencedRelation: "utente"
            referencedColumns: ["utente_uuid"]
          },
        ]
      }
      link_social_annuncio: {
        Row: {
          id: number
          piattaforma: string | null
          sublink: string
          uuid_annuncio: string
        }
        Insert: {
          id?: number
          piattaforma?: string | null
          sublink: string
          uuid_annuncio: string
        }
        Update: {
          id?: number
          piattaforma?: string | null
          sublink?: string
          uuid_annuncio?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_social_annuncio_uuid_annuncio_fkey"
            columns: ["uuid_annuncio"]
            isOneToOne: false
            referencedRelation: "annuncio"
            referencedColumns: ["uuid"]
          },
        ]
      }
      link_social_profilo: {
        Row: {
          id: number
          id_sottoprofilo: number | null
          piattaforma: string | null
          sottoprofilo: string | null
          sublink: string
          uuid_profilo: string
        }
        Insert: {
          id?: number
          id_sottoprofilo?: number | null
          piattaforma?: string | null
          sottoprofilo?: string | null
          sublink: string
          uuid_profilo: string
        }
        Update: {
          id?: number
          id_sottoprofilo?: number | null
          piattaforma?: string | null
          sottoprofilo?: string | null
          sublink?: string
          uuid_profilo?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_social_uuid_profilo_fkey"
            columns: ["uuid_profilo"]
            isOneToOne: false
            referencedRelation: "profilo"
            referencedColumns: ["uuid"]
          },
        ]
      }
      localita_annuncio: {
        Row: {
          citta: string | null
          id: number
          regione: string
          uuid_annuncio: string
        }
        Insert: {
          citta?: string | null
          id?: number
          regione: string
          uuid_annuncio: string
        }
        Update: {
          citta?: string | null
          id?: number
          regione?: string
          uuid_annuncio?: string
        }
        Relationships: [
          {
            foreignKeyName: "localita_annuncio_uuid_annuncio_fkey"
            columns: ["uuid_annuncio"]
            isOneToOne: false
            referencedRelation: "annuncio"
            referencedColumns: ["uuid"]
          },
        ]
      }
      localita_profilo: {
        Row: {
          citta: string | null
          id: number
          id_sottoprofilo: number | null
          regione: string
          sottoprofilo: string | null
          uuid_profilo: string
        }
        Insert: {
          citta?: string | null
          id?: number
          id_sottoprofilo?: number | null
          regione: string
          sottoprofilo?: string | null
          uuid_profilo: string
        }
        Update: {
          citta?: string | null
          id?: number
          id_sottoprofilo?: number | null
          regione?: string
          sottoprofilo?: string | null
          uuid_profilo?: string
        }
        Relationships: [
          {
            foreignKeyName: "localita_profilo_uuid_profilo_fkey"
            columns: ["uuid_profilo"]
            isOneToOne: false
            referencedRelation: "profilo"
            referencedColumns: ["uuid"]
          },
        ]
      }
      media_annuncio: {
        Row: {
          formato_media: string | null
          id: number
          link_media: string
          uuid_annuncio: string
        }
        Insert: {
          formato_media?: string | null
          id?: number
          link_media: string
          uuid_annuncio: string
        }
        Update: {
          formato_media?: string | null
          id?: number
          link_media?: string
          uuid_annuncio?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_annuncio_uuid_annuncio_fkey"
            columns: ["uuid_annuncio"]
            isOneToOne: false
            referencedRelation: "annuncio"
            referencedColumns: ["uuid"]
          },
        ]
      }
      media_profilo: {
        Row: {
          formato_media: string | null
          id: number
          link_media: string
          sottoprofilo: string | null
          storage_path: string | null
          uuid_profilo: string
        }
        Insert: {
          formato_media?: string | null
          id?: number
          link_media: string
          sottoprofilo?: string | null
          storage_path?: string | null
          uuid_profilo: string
        }
        Update: {
          formato_media?: string | null
          id?: number
          link_media?: string
          sottoprofilo?: string | null
          storage_path?: string | null
          uuid_profilo?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_profilo_uuid_profilo_fkey"
            columns: ["uuid_profilo"]
            isOneToOne: false
            referencedRelation: "profilo"
            referencedColumns: ["uuid"]
          },
        ]
      }
      restricted_profile_access: {
        Row: {
          allowed_regions: string[]
          profile_id: string
          profile_type: string
          enabled_at: string
        }
        Insert: {
          allowed_regions?: string[]
          profile_id: string
          profile_type: string
          enabled_at?: string
        }
        Update: {
          allowed_regions?: string[]
          profile_id?: string
          profile_type?: string
          enabled_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restricted_profile_access_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profilo"
            referencedColumns: ["uuid"]
          },
        ]
      }
      profilo: {
        Row: {
          confermato_il: string | null
          creato_da: string | null
          creato_il: string
          link_foto_profilo: string | null
          nascosto: boolean
          note_aggiuntive: string | null
          tipologia_principale: string | null
          ultima_modifica_da: string | null
          ultima_modifica_il: string
          uuid: string
          uuid_utente: string | null
          verificato_il: string | null
        }
        Insert: {
          confermato_il?: string | null
          creato_da?: string | null
          creato_il?: string
          link_foto_profilo?: string | null
          nascosto?: boolean
          note_aggiuntive?: string | null
          tipologia_principale?: string | null
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string
          uuid?: string
          uuid_utente?: string | null
          verificato_il?: string | null
        }
        Update: {
          confermato_il?: string | null
          creato_da?: string | null
          creato_il?: string
          link_foto_profilo?: string | null
          nascosto?: boolean
          note_aggiuntive?: string | null
          tipologia_principale?: string | null
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string
          uuid?: string
          uuid_utente?: string | null
          verificato_il?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profilo_creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "utente"
            referencedColumns: ["utente_uuid"]
          },
          {
            foreignKeyName: "profilo_ultima_modifica_da_fkey"
            columns: ["ultima_modifica_da"]
            isOneToOne: false
            referencedRelation: "utente"
            referencedColumns: ["utente_uuid"]
          },
          {
            foreignKeyName: "profilo_uuid_utente_fkey"
            columns: ["uuid_utente"]
            isOneToOne: false
            referencedRelation: "utente"
            referencedColumns: ["utente_uuid"]
          },
        ]
      }
      profilo_arbitro: {
        Row: {
          nominativo_anonimo: boolean
          anno_nascita: string | null
          cognome: string | null
          disponibilita: string | null
          giorno_nascita: string | null
          id: number
          lista_esperienze: Json
          mese_nascita: string | null
          nascosto: boolean
          nome: string | null
          presentazione: string | null
          qualifiche_licenze: Json
          sport_principale: string | null
          storico_esperienze: Json | null
          tipologie_sport: string[]
          uuid_profilo: string
        }
        Insert: {
          nominativo_anonimo?: boolean
          anno_nascita?: string | null
          cognome?: string | null
          disponibilita?: string | null
          giorno_nascita?: string | null
          id?: number
          lista_esperienze?: Json
          mese_nascita?: string | null
          nascosto?: boolean
          nome?: string | null
          presentazione?: string | null
          qualifiche_licenze?: Json
          sport_principale?: string | null
          storico_esperienze?: Json | null
          tipologie_sport?: string[]
          uuid_profilo: string
        }
        Update: {
          nominativo_anonimo?: boolean
          anno_nascita?: string | null
          cognome?: string | null
          disponibilita?: string | null
          giorno_nascita?: string | null
          id?: number
          lista_esperienze?: Json
          mese_nascita?: string | null
          nascosto?: boolean
          nome?: string | null
          presentazione?: string | null
          qualifiche_licenze?: Json
          sport_principale?: string | null
          storico_esperienze?: Json | null
          tipologie_sport?: string[]
          uuid_profilo?: string
        }
        Relationships: [
          {
            foreignKeyName: "profilo_arbitro_sport_principale_fkey"
            columns: ["sport_principale"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["nome"]
          },
          {
            foreignKeyName: "profilo_arbitro_uuid_profilo_fkey"
            columns: ["uuid_profilo"]
            isOneToOne: false
            referencedRelation: "profilo"
            referencedColumns: ["uuid"]
          },
        ]
      }
      profilo_campi_impianti: {
        Row: {
          costo_partenza: number | null
          id: number
          indirizzo: string | null
          info_aggiuntive: string | null
          nascosto: boolean
          nome_organizzazione: string | null
          orari: Json | null
          presentazione: string | null
          sede_principale: string | null
          servizi_inclusi: string | null
          sport_principale: string | null
          tipologie_sport: string[] | null
          uuid_profilo: string
        }
        Insert: {
          costo_partenza?: number | null
          id?: number
          indirizzo?: string | null
          info_aggiuntive?: string | null
          nascosto?: boolean
          nome_organizzazione?: string | null
          orari?: Json | null
          presentazione?: string | null
          sede_principale?: string | null
          servizi_inclusi?: string | null
          sport_principale?: string | null
          tipologie_sport?: string[] | null
          uuid_profilo: string
        }
        Update: {
          costo_partenza?: number | null
          id?: number
          indirizzo?: string | null
          info_aggiuntive?: string | null
          nascosto?: boolean
          nome_organizzazione?: string | null
          orari?: Json | null
          presentazione?: string | null
          sede_principale?: string | null
          servizi_inclusi?: string | null
          sport_principale?: string | null
          tipologie_sport?: string[] | null
          uuid_profilo?: string
        }
        Relationships: [
          {
            foreignKeyName: "profilo_campi_impianti_sport_principale_fkey"
            columns: ["sport_principale"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["nome"]
          },
          {
            foreignKeyName: "profilo_campi_impianti_uuid_profilo_fkey"
            columns: ["uuid_profilo"]
            isOneToOne: false
            referencedRelation: "profilo"
            referencedColumns: ["uuid"]
          },
        ]
      }
      profilo_creator: {
        Row: {
          contatto_email: string | null

          id: number
          nascosto: boolean
          nome_creator: string | null
          presentazione: string | null
          sport_principale: string | null
          tipologia_contenuti: string | null
          uuid_profilo: string
        }
        Insert: {
          contatto_email?: string | null

          id?: number
          nascosto?: boolean
          nome_creator?: string | null
          presentazione?: string | null
          sport_principale?: string | null
          tipologia_contenuti?: string | null
          uuid_profilo: string
        }
        Update: {
          contatto_email?: string | null

          id?: number
          nascosto?: boolean
          nome_creator?: string | null
          presentazione?: string | null
          sport_principale?: string | null
          tipologia_contenuti?: string | null
          uuid_profilo?: string
        }
        Relationships: [
          {
            foreignKeyName: "profilo_creators_sport_principale_fkey"
            columns: ["sport_principale"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["nome"]
          },
          {
            foreignKeyName: "profilo_creators_uuid_profilo_fkey"
            columns: ["uuid_profilo"]
            isOneToOne: false
            referencedRelation: "profilo"
            referencedColumns: ["uuid"]
          },
        ]
      }
      profilo_follow: {
        Row: {
          sottoprofilo_follower: string
          sottoprofilo_seguito: string
          creato_il: string
          uuid_profilo_follower: string
          uuid_profilo_seguito: string
        }
        Insert: {
          sottoprofilo_follower: string
          sottoprofilo_seguito: string
          creato_il?: string
          uuid_profilo_follower: string
          uuid_profilo_seguito: string
        }
        Update: {
          sottoprofilo_follower?: string
          sottoprofilo_seguito?: string
          creato_il?: string
          uuid_profilo_follower?: string
          uuid_profilo_seguito?: string
        }
        Relationships: [
          {
            foreignKeyName: "profilo_follow_uuid_profilo_follower_fkey"
            columns: ["uuid_profilo_follower"]
            isOneToOne: false
            referencedRelation: "profilo"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "profilo_follow_uuid_profilo_seguito_fkey"
            columns: ["uuid_profilo_seguito"]
            isOneToOne: false
            referencedRelation: "profilo"
            referencedColumns: ["uuid"]
          },
        ]
      }
      profilo_giocatore: {
        Row: {
          nominativo_anonimo: boolean
          altezza: string | null
          anno_nascita: string | null
          categoria_attuale: string | null
          categorie_ricercate: string[] | null
          cognome: string | null
          disponibilita: string | null
          genere: string | null
          giorno_nascita: string | null
          id: number
          mese_nascita: string | null
          nascosto: boolean
          nazionalita: string | null
          nome: string | null
          peso: string | null
          piede_principale: string | null
          presentazione: string | null
          highlights_privati: boolean
          richiede_caricamento_highlights: boolean
          ruoli_sport: Json | null
          sport_principale: string | null
          storico_carriera: Json | null
          tipologie_sport: string[] | null
          uuid_profilo: string
        }
        Insert: {
          nominativo_anonimo?: boolean
          altezza?: string | null
          anno_nascita?: string | null
          categoria_attuale?: string | null
          categorie_ricercate?: string[] | null
          cognome?: string | null
          disponibilita?: string | null
          genere?: string | null
          giorno_nascita?: string | null
          id?: number
          mese_nascita?: string | null
          nascosto?: boolean
          nazionalita?: string | null
          nome?: string | null
          peso?: string | null
          piede_principale?: string | null
          presentazione?: string | null
          highlights_privati?: boolean
          richiede_caricamento_highlights?: boolean
          ruoli_sport?: Json | null
          sport_principale?: string | null
          storico_carriera?: Json | null
          tipologie_sport?: string[] | null
          uuid_profilo: string
        }
        Update: {
          nominativo_anonimo?: boolean
          altezza?: string | null
          anno_nascita?: string | null
          categoria_attuale?: string | null
          categorie_ricercate?: string[] | null
          cognome?: string | null
          disponibilita?: string | null
          genere?: string | null
          giorno_nascita?: string | null
          id?: number
          mese_nascita?: string | null
          nascosto?: boolean
          nazionalita?: string | null
          nome?: string | null
          peso?: string | null
          piede_principale?: string | null
          presentazione?: string | null
          highlights_privati?: boolean
          richiede_caricamento_highlights?: boolean
          ruoli_sport?: Json | null
          sport_principale?: string | null
          storico_carriera?: Json | null
          tipologie_sport?: string[] | null
          uuid_profilo?: string
        }
        Relationships: [
          {
            foreignKeyName: "profilo_giocatore_sport_principale_fkey"
            columns: ["sport_principale"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["nome"]
          },
          {
            foreignKeyName: "profilo_giocatore_uuid_profilo_fkey"
            columns: ["uuid_profilo"]
            isOneToOne: false
            referencedRelation: "profilo"
            referencedColumns: ["uuid"]
          },
        ]
      }
      profilo_servizi_consulenze: {
        Row: {
          sede_professionista: string | null
          contatto_email: string | null
          contatto_telefono: string | null

          anno_nascita: string | null
          automunito: string | null
          cognome: string | null
          disponibilita: string | null
          figure_professionali: string[] | null
          giorno_nascita: string | null
          id: number
          lista_esperienze: Json
          mese_nascita: string | null
          nascosto: boolean
          nome: string | null
          presentazione: string | null
          presentazione_servizi: string | null
          qualifiche_licenze: Json
          specializzazioni: string | null
          sport_principale: string | null
          storico_esperienze: Json | null
          tipologie_sport: string[] | null
          uuid_profilo: string
        }
        Insert: {
          sede_professionista?: string | null
          contatto_email?: string | null
          contatto_telefono?: string | null

          anno_nascita?: string | null
          automunito?: string | null
          cognome?: string | null
          disponibilita?: string | null
          figure_professionali?: string[] | null
          giorno_nascita?: string | null
          id?: number
          lista_esperienze?: Json
          mese_nascita?: string | null
          nascosto?: boolean
          nome?: string | null
          presentazione?: string | null
          presentazione_servizi?: string | null
          qualifiche_licenze?: Json
          specializzazioni?: string | null
          sport_principale?: string | null
          storico_esperienze?: Json | null
          tipologie_sport?: string[] | null
          uuid_profilo: string
        }
        Update: {
          sede_professionista?: string | null
          contatto_email?: string | null
          contatto_telefono?: string | null

          anno_nascita?: string | null
          automunito?: string | null
          cognome?: string | null
          disponibilita?: string | null
          figure_professionali?: string[] | null
          giorno_nascita?: string | null
          id?: number
          lista_esperienze?: Json
          mese_nascita?: string | null
          nascosto?: boolean
          nome?: string | null
          presentazione?: string | null
          presentazione_servizi?: string | null
          qualifiche_licenze?: Json
          specializzazioni?: string | null
          sport_principale?: string | null
          storico_esperienze?: Json | null
          tipologie_sport?: string[] | null
          uuid_profilo?: string
        }
        Relationships: [
          {
            foreignKeyName: "profilo_servizi_consulenze_sport_principale_fkey"
            columns: ["sport_principale"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["nome"]
          },
          {
            foreignKeyName: "profilo_servizi_consulenze_uuid_profilo_fkey"
            columns: ["uuid_profilo"]
            isOneToOne: false
            referencedRelation: "profilo"
            referencedColumns: ["uuid"]
          },
        ]
      }
      profilo_squadra: {
        Row: {
          nominativo_anonimo: boolean
		  categoria_attuale: string | null
          id: number
          nascosto: boolean
          nome_societa: string | null
          presentazione: string | null
          sede_principale: string | null
          sport_principale: string | null
          tipologie_sport: string[] | null
          uuid_profilo: string
        }
        Insert: {
          nominativo_anonimo?: boolean
		  categoria_attuale?: string | null
          id?: number
          nascosto?: boolean
          nome_societa?: string | null
          presentazione?: string | null
          sede_principale?: string | null
          sport_principale?: string | null
          tipologie_sport?: string[] | null
          uuid_profilo: string
        }
        Update: {
          nominativo_anonimo?: boolean
		  categoria_attuale?: string | null
          id?: number
          nascosto?: boolean
          nome_societa?: string | null
          presentazione?: string | null
          sede_principale?: string | null
          sport_principale?: string | null
          tipologie_sport?: string[] | null
          uuid_profilo?: string
        }
        Relationships: [
          {
            foreignKeyName: "profilo_squadra_sport_principale_fkey"
            columns: ["sport_principale"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["nome"]
          },
          {
            foreignKeyName: "profilo_squadra_uuid_profilo_fkey"
            columns: ["uuid_profilo"]
            isOneToOne: false
            referencedRelation: "profilo"
            referencedColumns: ["uuid"]
          },
        ]
      }
      profilo_staff_sportivo: {
        Row: {
          nominativo_anonimo: boolean
          anno_nascita: string | null
          cognome: string | null
          disponibilita: string | null
          disponibile_remoto: boolean
          figure_professionali: string[] | null
          giorno_nascita: string | null
          id: number
          lista_esperienze: Json | null
          mese_nascita: string | null
          nascosto: boolean
          nome: string | null
          presentazione: string | null
          qualifiche_licenze: Json | null
          sport_principale: string | null
          storico_esperienze: Json | null
          tipologie_sport: string[]
          uuid_profilo: string
        }
        Insert: {
          nominativo_anonimo?: boolean
          anno_nascita?: string | null
          cognome?: string | null
          disponibilita?: string | null
          disponibile_remoto?: boolean
          figure_professionali?: string[] | null
          giorno_nascita?: string | null
          id?: number
          lista_esperienze?: Json | null
          mese_nascita?: string | null
          nascosto?: boolean
          nome?: string | null
          presentazione?: string | null
          qualifiche_licenze?: Json | null
          sport_principale?: string | null
          storico_esperienze?: Json | null
          tipologie_sport?: string[]
          uuid_profilo: string
        }
        Update: {
          nominativo_anonimo?: boolean
          anno_nascita?: string | null
          cognome?: string | null
          disponibilita?: string | null
          disponibile_remoto?: boolean
          figure_professionali?: string[] | null
          giorno_nascita?: string | null
          id?: number
          lista_esperienze?: Json | null
          mese_nascita?: string | null
          nascosto?: boolean
          nome?: string | null
          presentazione?: string | null
          qualifiche_licenze?: Json | null
          sport_principale?: string | null
          storico_esperienze?: Json | null
          tipologie_sport?: string[]
          uuid_profilo?: string
        }
        Relationships: [
          {
            foreignKeyName: "profilo_staff_sportivo_sport_principale_fkey"
            columns: ["sport_principale"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["nome"]
          },
          {
            foreignKeyName: "profilo_staff_sportivo_uuid_profilo_fkey"
            columns: ["uuid_profilo"]
            isOneToOne: false
            referencedRelation: "profilo"
            referencedColumns: ["uuid"]
          },
        ]
      }
      profilo_torneo_evento: {
        Row: {
          id: number
          nascosto: boolean
          nome_organizzazione: string | null
          presentazione: string | null
          sede_principale: string | null
          sport_principale: string | null
          tipologie_sport: string[] | null
          uuid_profilo: string
        }
        Insert: {
          id?: number
          nascosto?: boolean
          nome_organizzazione?: string | null
          presentazione?: string | null
          sede_principale?: string | null
          sport_principale?: string | null
          tipologie_sport?: string[] | null
          uuid_profilo: string
        }
        Update: {
          id?: number
          nascosto?: boolean
          nome_organizzazione?: string | null
          presentazione?: string | null
          sede_principale?: string | null
          sport_principale?: string | null
          tipologie_sport?: string[] | null
          uuid_profilo?: string
        }
        Relationships: [
          {
            foreignKeyName: "profilo_torneo_evento_sport_principale_fkey"
            columns: ["sport_principale"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["nome"]
          },
          {
            foreignKeyName: "profilo_torneo_evento_uuid_profilo_fkey"
            columns: ["uuid_profilo"]
            isOneToOne: false
            referencedRelation: "profilo"
            referencedColumns: ["uuid"]
          },
        ]
      }
      sport: {
        Row: {
          creato_da: string | null
          creato_il: string | null
          descrizione: string | null
          nascosto: boolean | null
          nome: string
          ultima_modifica_da: string | null
          ultima_modifica_il: string | null
        }
        Insert: {
          creato_da?: string | null
          creato_il?: string | null
          descrizione?: string | null
          nascosto?: boolean | null
          nome: string
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
        }
        Update: {
          creato_da?: string | null
          creato_il?: string | null
          descrizione?: string | null
          nascosto?: boolean | null
          nome?: string
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sport_creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "utente"
            referencedColumns: ["utente_uuid"]
          },
          {
            foreignKeyName: "sport_ultima_modifica_da_fkey"
            columns: ["ultima_modifica_da"]
            isOneToOne: false
            referencedRelation: "utente"
            referencedColumns: ["utente_uuid"]
          },
        ]
      }
      utente: {
        Row: {
          auth_user_uuid: string
          codice_invito: string | null
          consenso_newsletter: boolean
          consenso_newsletter_aggiornato_il: string | null
          creato_il: string
          indirizzo_email: string | null
          informative_accettate_il: string | null
          num_telefono: string | null
          registrato_il: string | null
          tipologia_utente: string
          ultima_modifica_il: string
          utente_uuid: string
          versione_cookie_policy: string | null
          versione_privacy: string | null
          versione_termini: string | null
        }
        Insert: {
          auth_user_uuid: string
          codice_invito?: string | null
          consenso_newsletter?: boolean
          consenso_newsletter_aggiornato_il?: string | null
          creato_il?: string
          indirizzo_email?: string | null
          informative_accettate_il?: string | null
          num_telefono?: string | null
          registrato_il?: string | null
          tipologia_utente?: string
          ultima_modifica_il?: string
          utente_uuid?: string
          versione_cookie_policy?: string | null
          versione_privacy?: string | null
          versione_termini?: string | null
        }
        Update: {
          auth_user_uuid?: string
          codice_invito?: string | null
          consenso_newsletter?: boolean
          consenso_newsletter_aggiornato_il?: string | null
          creato_il?: string
          indirizzo_email?: string | null
          informative_accettate_il?: string | null
          num_telefono?: string | null
          registrato_il?: string | null
          tipologia_utente?: string
          ultima_modifica_il?: string
          utente_uuid?: string
          versione_cookie_policy?: string | null
          versione_privacy?: string | null
          versione_termini?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      set_profile_follow_v2: {
        Args: {p_user: string; p_target: string; p_target_type: string; p_source_type: string | null; p_followed: boolean}
        Returns: Json
      }
      get_profile_activity_v1: {
        Args: {p_ids: string[]}
        Returns: {profile_id: string; profile_type: string; last_activity: string}[]
      }
      admin_configure_professional_access_v1: {
        Args: { p_profile_id: string; p_allowed_regions: string[] }
        Returns: undefined
      }
      admin_set_restricted_profile_access_v1: {
        Args: { p_profile_id: string; p_profile_type: string; p_enabled: boolean }
        Returns: undefined
      }
      get_notifications_v1: {
        Args: { p_user: string; p_limit?: number; p_cursor_date?: string | null; p_cursor_id?: string | null }
        Returns: Json
      }
      mark_notifications_read_v1: {
        Args: { p_user: string; p_ids: string[] }
        Returns: number
      }
      cancel_registration: { Args: { p_token: string }; Returns: undefined }
      complete_registration_v1: {
        Args: { p_token: string }
        Returns: undefined
      }
      consume_publish_email_otp_request_v1: {
        Args: { p_email_hash: string }
        Returns: Json
      }
      delete_owned_subprofile: {
        Args: { p_profile_type: string; p_user_id: string }
        Returns: string
      }
      get_owned_priority_checkout_v1: {
        Args: { p_announcement_id: string }
        Returns: Json
      }
      get_registration_email_identity_v1: {
        Args: { p_email: string }
        Returns: {
          auth_user_uuid: string
          identity_status: string
        }[]
      }
      json_array_to_object: { Args: { _arr: Json[] }; Returns: Json }
      jsonb_array_to_object: { Args: { _arr: Json[] }; Returns: Json }
      prepare_registration: {
        Args: { p_email: string; p_payload: Json }
        Returns: string
      }
      prepare_registration_core_v1: {
        Args: { p_email: string; p_payload: Json }
        Returns: string
      }
      publish_announcement_core_v1: {
        Args: {
          p_payload: Json
          p_privacy_version: string
          p_submission_id: string
          p_terms_version: string
        }
        Returns: Json
      }
      publish_announcement_v1: {
        Args: {
          p_payload: Json
          p_privacy_version: string
          p_submission_id: string
          p_terms_version: string
        }
        Returns: Json
      }
      publish_announcement_v2: {
        Args: {
          p_payload: Json
          p_privacy_version: string
          p_submission_id: string
          p_terms_version: string
          p_visibility: string
        }
        Returns: Json
      }
      record_priority_checkout_event_v1:
        | {
            Args: {
              p_amount_subtotal: number
              p_amount_total: number
              p_announcement_id: string
              p_checkout_status: string
              p_paid: boolean
              p_payment_intent_id: string | null
              p_payment_status: string
              p_price_id: string
              p_session_id: string
              p_submission_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_announcement_id: string
              p_checkout_status: string
              p_paid: boolean
              p_payment_intent_id: string | null
              p_payment_status: string
              p_price_id: string
              p_session_id: string
              p_submission_id: string
            }
            Returns: Json
          }
      record_priority_checkout_session_v1:
        | {
            Args: {
              p_amount_subtotal: number
              p_amount_total: number
              p_announcement_id: string
              p_attempt: number
              p_checkout_status: string
              p_payment_status: string
              p_price_id: string
              p_session_id: string
              p_submission_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_announcement_id: string
              p_attempt: number
              p_checkout_status: string
              p_payment_status: string
              p_price_id: string
              p_session_id: string
              p_submission_id: string
            }
            Returns: Json
          }
      record_priority_refund_v1:
        | {
            Args: {
              p_payment_intent_id: string
              p_refund_id: string
              p_refund_status: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_amount: number
              p_currency: string
              p_payment_intent_id: string
              p_refund_id: string
              p_refund_status: string
            }
            Returns: Json
          }
      save_owned_profile_social_links_v1: {
        Args: {
          p_profile_type: string
          p_social_links: Json
          p_user_id: string
        }
        Returns: undefined
      }
      save_owned_subprofile: {
        Args: {
          p_draft: Json
          p_locations: Json
          p_profile_type: string
          p_user_id: string
        }
        Returns: Json
      }
      save_owned_subprofile_with_social_links_v1: {
        Args: {
          p_draft: Json
          p_locations: Json
          p_profile_type: string
          p_social_links: Json
          p_user_id: string
        }
        Returns: Json
      }
      set_owned_primary_subprofile: {
        Args: { p_profile_type: string; p_user_id: string }
        Returns: undefined
      }
      submit_manifestazione_interesse_v1: {
        Args: {
          p_sender_user_uuid: string
          p_sender_profile_type: string
          p_target_kind: string
          p_target_uuid: string
          p_target_profile_type: string | null
          p_email: string | null
          p_phone: string | null
          p_ownership_consent: boolean
          p_sharing_consent: boolean
          p_consent_version: string
        }
        Returns: Json
      }
      submit_segnalazione_v1: {
        Args: {
          p_anonymous_key_hash: string | null
          p_reason: string | null
          p_reporter_user_uuid: string | null
          p_target_kind: string
          p_target_uuid: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
