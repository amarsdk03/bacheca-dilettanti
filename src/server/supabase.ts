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
    PostgrestVersion: "14.17"
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
          privato: boolean | null
          stato_annuncio: string | null
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
          privato?: boolean | null
          stato_annuncio?: string | null
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
          privato?: boolean | null
          stato_annuncio?: string | null
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
          info_mostrate: Json | null
          orari: Json | null
          servizi_inclusi: string | null
          tipologie_sport: string[] | null
          uuid_annuncio: string
        }
        Insert: {
          costo_partenza?: number | null
          descrizione_aggiuntiva?: string | null
          info_mostrate?: Json | null
          orari?: Json | null
          servizi_inclusi?: string | null
          tipologie_sport?: string[] | null
          uuid_annuncio: string
        }
        Update: {
          costo_partenza?: number | null
          descrizione_aggiuntiva?: string | null
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
          descrizione_aggiuntiva: string | null
          info_mostrate: Json | null
          ruoli_principali: string[] | null
          ruoli_secondari: string[] | null
          tipologie_sport: string[] | null
          uuid_annuncio: string
        }
        Insert: {
          descrizione_aggiuntiva?: string | null
          info_mostrate?: Json | null
          ruoli_principali?: string[] | null
          ruoli_secondari?: string[] | null
          tipologie_sport?: string[] | null
          uuid_annuncio: string
        }
        Update: {
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
      annuncio_professionista_studente: {
        Row: {
          automunito: string | null
          descrizione_aggiuntiva: string | null
          figura_professionale: string[] | null
          info_mostrate: Json | null
          lista_esperienze: Json | null
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
          presentazione_servizi?: string | null
          specializzazione?: string | null
          tipologie_sport?: Json | null
          uuid_annuncio?: string
        }
        Relationships: [
          {
            foreignKeyName: "annuncio_professionista_studente_uuid_annuncio_fkey"
            columns: ["uuid_annuncio"]
            isOneToOne: true
            referencedRelation: "annuncio"
            referencedColumns: ["uuid"]
          },
        ]
      }
      annuncio_squadra_cerca_giocatore: {
        Row: {
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
          info_mostrate: Json | null
          periodo_al: string | null
          periodo_dal: string | null
          requisiti: string | null
          settore: string | null
          uuid_annuncio: string
        }
        Insert: {
          compenso_mensile?: number | null
          descrizione_aggiuntiva?: string | null
          figura_ricercata?: string | null
          info_mostrate?: Json | null
          periodo_al?: string | null
          periodo_dal?: string | null
          requisiti?: string | null
          settore?: string | null
          uuid_annuncio: string
        }
        Update: {
          compenso_mensile?: number | null
          descrizione_aggiuntiva?: string | null
          figura_ricercata?: string | null
          info_mostrate?: Json | null
          periodo_al?: string | null
          periodo_dal?: string | null
          requisiti?: string | null
          settore?: string | null
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
          disponibilita_occupazione: string | null
          disponibilita_spostamento: string | null
          figure_professionali: string[] | null
          info_mostrate: Json | null
          lista_esperienze: Json | null
          tipologie_sport: string[] | null
          uuid_annuncio: string
        }
        Insert: {
          categorie_ricercate?: string[] | null
          descrizione_aggiuntiva?: string | null
          disponibilita_occupazione?: string | null
          disponibilita_spostamento?: string | null
          figure_professionali?: string[] | null
          info_mostrate?: Json | null
          lista_esperienze?: Json | null
          tipologie_sport?: string[] | null
          uuid_annuncio: string
        }
        Update: {
          categorie_ricercate?: string[] | null
          descrizione_aggiuntiva?: string | null
          disponibilita_occupazione?: string | null
          disponibilita_spostamento?: string | null
          figure_professionali?: string[] | null
          info_mostrate?: Json | null
          lista_esperienze?: Json | null
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
      categoria_sport: {
        Row: {
          categoria: string
          creato_da: string | null
          creato_il: string | null
          dettagli_aggiuntivi: string | null
          macrocategoria: string
          nascosto: boolean | null
          sport: string
          ultima_modifica_da: string | null
          ultima_modifica_il: string | null
        }
        Insert: {
          categoria: string
          creato_da?: string | null
          creato_il?: string | null
          dettagli_aggiuntivi?: string | null
          macrocategoria: string
          nascosto?: boolean | null
          sport: string
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
        }
        Update: {
          categoria?: string
          creato_da?: string | null
          creato_il?: string | null
          dettagli_aggiuntivi?: string | null
          macrocategoria?: string
          nascosto?: boolean | null
          sport?: string
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categoria_sport_creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "utente"
            referencedColumns: ["utente_uuid"]
          },
          {
            foreignKeyName: "Categoria_sport_sport_fkey"
            columns: ["sport"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["nome"]
          },
          {
            foreignKeyName: "categoria_sport_ultima_modifica_da_fkey"
            columns: ["ultima_modifica_da"]
            isOneToOne: false
            referencedRelation: "utente"
            referencedColumns: ["utente_uuid"]
          },
        ]
      }
      codici_otp: {
        Row: {
          causale: string | null
          codice: string
          generato_il: string | null
          id: number
          scadenza_il: string | null
          utente_destinatario: string | null
        }
        Insert: {
          causale?: string | null
          codice: string
          generato_il?: string | null
          id?: number
          scadenza_il?: string | null
          utente_destinatario?: string | null
        }
        Update: {
          causale?: string | null
          codice?: string
          generato_il?: string | null
          id?: number
          scadenza_il?: string | null
          utente_destinatario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "codici_otp_utente_destinatario_fkey"
            columns: ["utente_destinatario"]
            isOneToOne: false
            referencedRelation: "utente"
            referencedColumns: ["utente_uuid"]
          },
        ]
      }
      figura_professionale: {
        Row: {
          creato_da: string | null
          creato_il: string | null
          dettagli_aggiuntivi: string | null
          nascosto: boolean | null
          titolo: string
          ultima_modifica_da: string | null
          ultima_modifica_il: string | null
        }
        Insert: {
          creato_da?: string | null
          creato_il?: string | null
          dettagli_aggiuntivi?: string | null
          nascosto?: boolean | null
          titolo: string
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
        }
        Update: {
          creato_da?: string | null
          creato_il?: string | null
          dettagli_aggiuntivi?: string | null
          nascosto?: boolean | null
          titolo?: string
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "figura_professionale_creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "utente"
            referencedColumns: ["utente_uuid"]
          },
          {
            foreignKeyName: "figura_professionale_ultima_modifica_da_fkey"
            columns: ["ultima_modifica_da"]
            isOneToOne: false
            referencedRelation: "utente"
            referencedColumns: ["utente_uuid"]
          },
        ]
      }
      contatto_annuncio: {
        Row: {
          id: number
          tipo: string
          uuid_annuncio: string
          valore: string
        }
        Insert: {
          id?: number
          tipo: string
          uuid_annuncio: string
          valore: string
        }
        Update: {
          id?: number
          tipo?: string
          uuid_annuncio?: string
          valore?: string
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
      profilo: {
        Row: {
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
          anno_nascita: string | null
          cognome: string | null
          disponibilita: string | null
          giorno_nascita: string | null
          id: number
          mese_nascita: string | null
          nascosto: boolean
          nome: string | null
          presentazione: string | null
          sport_principale: string | null
          storico_esperienze: Json | null
          uuid_profilo: string
        }
        Insert: {
          anno_nascita?: string | null
          cognome?: string | null
          disponibilita?: string | null
          giorno_nascita?: string | null
          id?: number
          mese_nascita?: string | null
          nascosto?: boolean
          nome?: string | null
          presentazione?: string | null
          sport_principale?: string | null
          storico_esperienze?: Json | null
          uuid_profilo: string
        }
        Update: {
          anno_nascita?: string | null
          cognome?: string | null
          disponibilita?: string | null
          giorno_nascita?: string | null
          id?: number
          mese_nascita?: string | null
          nascosto?: boolean
          nome?: string | null
          presentazione?: string | null
          sport_principale?: string | null
          storico_esperienze?: Json | null
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
          id: number
          nascosto: boolean
          nome_creator: string | null
          presentazione: string | null
          sport_principale: string | null
          tipologia_contenuti: string | null
          uuid_profilo: string
        }
        Insert: {
          id?: number
          nascosto?: boolean
          nome_creator?: string | null
          presentazione?: string | null
          sport_principale?: string | null
          tipologia_contenuti?: string | null
          uuid_profilo: string
        }
        Update: {
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
      profilo_giocatore: {
        Row: {
          altezza: string | null
          anno_nascita: string | null
          cognome: string | null
          disponibilita: string | null
          giorno_nascita: string | null
          id: number
          mese_nascita: string | null
          nascosto: boolean
          nome: string | null
          peso: string | null
          piede_principale: string | null
          presentazione: string | null
          ruoli_sport: Json | null
          sport_principale: string | null
          storico_carriera: Json | null
          tipologie_sport: string[] | null
          uuid_profilo: string
        }
        Insert: {
          altezza?: string | null
          anno_nascita?: string | null
          cognome?: string | null
          disponibilita?: string | null
          giorno_nascita?: string | null
          id?: number
          mese_nascita?: string | null
          nascosto?: boolean
          nome?: string | null
          peso?: string | null
          piede_principale?: string | null
          presentazione?: string | null
          ruoli_sport?: Json | null
          sport_principale?: string | null
          storico_carriera?: Json | null
          tipologie_sport?: string[] | null
          uuid_profilo: string
        }
        Update: {
          altezza?: string | null
          anno_nascita?: string | null
          cognome?: string | null
          disponibilita?: string | null
          giorno_nascita?: string | null
          id?: number
          mese_nascita?: string | null
          nascosto?: boolean
          nome?: string | null
          peso?: string | null
          piede_principale?: string | null
          presentazione?: string | null
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
      profilo_professionista_studente: {
        Row: {
          anno_nascita: string | null
          automunito: string | null
          cognome: string | null
          disponibilita: string | null
          figure_professionali: string[] | null
          giorno_nascita: string | null
          id: number
          mese_nascita: string | null
          nascosto: boolean
          nome: string | null
          presentazione: string | null
          presentazione_servizi: string | null
          specializzazioni: string | null
          sport_principale: string | null
          storico_esperienze: Json | null
          tipologie_sport: string[] | null
          uuid_profilo: string
        }
        Insert: {
          anno_nascita?: string | null
          automunito?: string | null
          cognome?: string | null
          disponibilita?: string | null
          figure_professionali?: string[] | null
          giorno_nascita?: string | null
          id?: number
          mese_nascita?: string | null
          nascosto?: boolean
          nome?: string | null
          presentazione?: string | null
          presentazione_servizi?: string | null
          specializzazioni?: string | null
          sport_principale?: string | null
          storico_esperienze?: Json | null
          tipologie_sport?: string[] | null
          uuid_profilo: string
        }
        Update: {
          anno_nascita?: string | null
          automunito?: string | null
          cognome?: string | null
          disponibilita?: string | null
          figure_professionali?: string[] | null
          giorno_nascita?: string | null
          id?: number
          mese_nascita?: string | null
          nascosto?: boolean
          nome?: string | null
          presentazione?: string | null
          presentazione_servizi?: string | null
          specializzazioni?: string | null
          sport_principale?: string | null
          storico_esperienze?: Json | null
          tipologie_sport?: string[] | null
          uuid_profilo?: string
        }
        Relationships: [
          {
            foreignKeyName: "profilo_professionisti_studenti_sport_principale_fkey"
            columns: ["sport_principale"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["nome"]
          },
          {
            foreignKeyName: "profilo_professionisti_studenti_uuid_profilo_fkey"
            columns: ["uuid_profilo"]
            isOneToOne: false
            referencedRelation: "profilo"
            referencedColumns: ["uuid"]
          },
        ]
      }
      profilo_squadra: {
        Row: {
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
          anno_nascita: string | null
          cognome: string | null
          disponibilita: string | null
          figure_professionali: string[] | null
          giorno_nascita: string | null
          id: number
          mese_nascita: string | null
          nascosto: boolean
          nome: string | null
          presentazione: string | null
          sport_principale: string | null
          storico_esperienze: Json | null
          uuid_profilo: string
        }
        Insert: {
          anno_nascita?: string | null
          cognome?: string | null
          disponibilita?: string | null
          figure_professionali?: string[] | null
          giorno_nascita?: string | null
          id?: number
          mese_nascita?: string | null
          nascosto?: boolean
          nome?: string | null
          presentazione?: string | null
          sport_principale?: string | null
          storico_esperienze?: Json | null
          uuid_profilo: string
        }
        Update: {
          anno_nascita?: string | null
          cognome?: string | null
          disponibilita?: string | null
          figure_professionali?: string[] | null
          giorno_nascita?: string | null
          id?: number
          mese_nascita?: string | null
          nascosto?: boolean
          nome?: string | null
          presentazione?: string | null
          sport_principale?: string | null
          storico_esperienze?: Json | null
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
      ruolo_sport: {
        Row: {
          creato_da: string | null
          creato_il: string | null
          dettagli_aggiuntivi: string | null
          macroruolo: string
          nascosto: boolean | null
          ruolo: string
          sport: string
          ultima_modifica_da: string | null
          ultima_modifica_il: string | null
        }
        Insert: {
          creato_da?: string | null
          creato_il?: string | null
          dettagli_aggiuntivi?: string | null
          macroruolo: string
          nascosto?: boolean | null
          ruolo: string
          sport: string
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
        }
        Update: {
          creato_da?: string | null
          creato_il?: string | null
          dettagli_aggiuntivi?: string | null
          macroruolo?: string
          nascosto?: boolean | null
          ruolo?: string
          sport?: string
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ruolo_sport_creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "utente"
            referencedColumns: ["utente_uuid"]
          },
          {
            foreignKeyName: "Ruolo_sport_sport_fkey"
            columns: ["sport"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["nome"]
          },
          {
            foreignKeyName: "ruolo_sport_ultima_modifica_da_fkey"
            columns: ["ultima_modifica_da"]
            isOneToOne: false
            referencedRelation: "utente"
            referencedColumns: ["utente_uuid"]
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
      tipologia_sport: {
        Row: {
          creato_da: string | null
          creato_il: string | null
          dettagli_aggiuntivi: string | null
          nascosto: boolean | null
          sport: string
          tipologia: string
          ultima_modifica_da: string | null
          ultima_modifica_il: string | null
        }
        Insert: {
          creato_da?: string | null
          creato_il?: string | null
          dettagli_aggiuntivi?: string | null
          nascosto?: boolean | null
          sport: string
          tipologia: string
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
        }
        Update: {
          creato_da?: string | null
          creato_il?: string | null
          dettagli_aggiuntivi?: string | null
          nascosto?: boolean | null
          sport?: string
          tipologia?: string
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tipologia_sport_creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "utente"
            referencedColumns: ["utente_uuid"]
          },
          {
            foreignKeyName: "Tipologia_sport_sport_fkey"
            columns: ["sport"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["nome"]
          },
          {
            foreignKeyName: "tipologia_sport_ultima_modifica_da_fkey"
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
          creato_il: string
          indirizzo_email: string | null
          num_telefono: string | null
          registrato_il: string | null
          tipologia_utente: string
          ultima_modifica_il: string
          utente_uuid: string
        }
        Insert: {
          auth_user_uuid: string
          creato_il?: string
          indirizzo_email?: string | null
          num_telefono?: string | null
          registrato_il?: string | null
          tipologia_utente?: string
          ultima_modifica_il?: string
          utente_uuid?: string
        }
        Update: {
          auth_user_uuid?: string
          creato_il?: string
          indirizzo_email?: string | null
          num_telefono?: string | null
          registrato_il?: string | null
          tipologia_utente?: string
          ultima_modifica_il?: string
          utente_uuid?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_registration: { Args: { p_token: string }; Returns: undefined }
      complete_registration_v1: {
        Args: { p_token: string }
        Returns: undefined
      }
      consume_publish_email_otp_request_v1: {
        Args: { p_email_hash: string }
        Returns: Json
      }
      get_registration_email_identity_v1: {
        Args: { p_email: string }
        Returns: {
          auth_user_uuid: string | null
          identity_status: string
        }[]
      }
      delete_owned_subprofile: {
        Args: { p_profile_type: string; p_user_id: string }
        Returns: string
      }
      json_array_to_object: { Args: { _arr: Json[] }; Returns: Json }
      jsonb_array_to_object: { Args: { _arr: Json[] }; Returns: Json }
      prepare_registration: {
        Args: { p_email: string; p_payload: Json }
        Returns: string
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
      save_owned_subprofile: {
        Args: {
          p_draft: Json
          p_locations: Json
          p_profile_type: string
          p_user_id: string
        }
        Returns: Json
      }
      set_owned_primary_subprofile: {
        Args: { p_profile_type: string; p_user_id: string }
        Returns: undefined
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
