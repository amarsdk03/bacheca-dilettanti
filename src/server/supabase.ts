// noinspection JSNonASCIINames,NonAsciiCharacters

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
      Annuncio_generico: {
        Row: {
          annuncio_da: string
          annuncio_per: string
          contenuto: Json | null
          creato_da: string | null
          creato_il: string | null
          id: string
          id_autore: string
          livello_annuncio: string | null
          nascosto: boolean | null
          privato: boolean | null
          stato_annuncio: string | null
          ultima_modifica_da: string | null
          ultima_modifica_il: string | null
        }
        Insert: {
          annuncio_da: string
          annuncio_per: string
          contenuto?: Json | null
          creato_da?: string | null
          creato_il?: string | null
          id?: string
          id_autore: string
          livello_annuncio?: string | null
          nascosto?: boolean | null
          privato?: boolean | null
          stato_annuncio?: string | null
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
        }
        Update: {
          annuncio_da?: string
          annuncio_per?: string
          contenuto?: Json | null
          creato_da?: string | null
          creato_il?: string | null
          id?: string
          id_autore?: string
          livello_annuncio?: string | null
          nascosto?: boolean | null
          privato?: boolean | null
          stato_annuncio?: string | null
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
          {
            foreignKeyName: "ultima_modifica_da_fkey"
            columns: ["ultima_modifica_da"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
        ]
      }
      Arbitro: {
        Row: {
          anno_nascita: string | null
          biografia: string | null
          cognome: string | null
          creato_da: string | null
          creato_il: string | null
          email_associata: string | null
          giorno_nascita: string | null
          id: string
          link_foto: string | null
          link_social: Json | null
          lista_esperienze: Json | null
          località: Json | null
          mese_nascita: string | null
          nascosto: boolean | null
          nome: string | null
          sport: string | null
          spostamento: boolean | null
          tipologia_sport: string | null
          ultima_modifica_da: string | null
          ultima_modifica_il: string | null
          verificato: boolean | null
        }
        Insert: {
          anno_nascita?: string | null
          biografia?: string | null
          cognome?: string | null
          creato_da?: string | null
          creato_il?: string | null
          email_associata?: string | null
          giorno_nascita?: string | null
          id?: string
          link_foto?: string | null
          link_social?: Json | null
          lista_esperienze?: Json | null
          località?: Json | null
          mese_nascita?: string | null
          nascosto?: boolean | null
          nome?: string | null
          sport?: string | null
          spostamento?: boolean | null
          tipologia_sport?: string | null
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
          verificato?: boolean | null
        }
        Update: {
          anno_nascita?: string | null
          biografia?: string | null
          cognome?: string | null
          creato_da?: string | null
          creato_il?: string | null
          email_associata?: string | null
          giorno_nascita?: string | null
          id?: string
          link_foto?: string | null
          link_social?: Json | null
          lista_esperienze?: Json | null
          località?: Json | null
          mese_nascita?: string | null
          nascosto?: boolean | null
          nome?: string | null
          sport?: string | null
          spostamento?: boolean | null
          tipologia_sport?: string | null
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
          verificato?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
          {
            foreignKeyName: "giocatore_email_associata_fkey"
            columns: ["email_associata"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
          {
            foreignKeyName: "ultima_modifica_da_fkey"
            columns: ["ultima_modifica_da"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
        ]
      }
      Categoria_sport: {
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
            foreignKeyName: "Categoria_sport_sport_fkey"
            columns: ["sport"]
            isOneToOne: false
            referencedRelation: "Sport"
            referencedColumns: ["nome"]
          },
          {
            foreignKeyName: "creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
          {
            foreignKeyName: "modificato_da_fkey"
            columns: ["ultima_modifica_da"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
        ]
      }
      Ente_sportivo: {
        Row: {
          creato_da: string | null
          creato_il: string | null
          descrizione: string | null
          email_associata: string | null
          id: string
          link_logo: string | null
          link_social: Json | null
          nascosto: boolean | null
          nome: string | null
          sede_principale: string | null
          sport: string | null
          tipologia_sport: string | null
          ultima_modifica_da: string | null
          ultima_modifica_il: string | null
          verificato: boolean | null
        }
        Insert: {
          creato_da?: string | null
          creato_il?: string | null
          descrizione?: string | null
          email_associata?: string | null
          id?: string
          link_logo?: string | null
          link_social?: Json | null
          nascosto?: boolean | null
          nome?: string | null
          sede_principale?: string | null
          sport?: string | null
          tipologia_sport?: string | null
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
          verificato?: boolean | null
        }
        Update: {
          creato_da?: string | null
          creato_il?: string | null
          descrizione?: string | null
          email_associata?: string | null
          id?: string
          link_logo?: string | null
          link_social?: Json | null
          nascosto?: boolean | null
          nome?: string | null
          sede_principale?: string | null
          sport?: string | null
          tipologia_sport?: string | null
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
          verificato?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ente_sportivo_creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
          {
            foreignKeyName: "ente_sportivo_email_associata_fkey"
            columns: ["email_associata"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
          {
            foreignKeyName: "ente_sportivo_ultima_modifica_da_fkey"
            columns: ["ultima_modifica_da"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
        ]
      }
      Figura_professionale: {
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
            foreignKeyName: "creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
          {
            foreignKeyName: "modificato_da_fkey"
            columns: ["ultima_modifica_da"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
        ]
      }
      Giocatore: {
        Row: {
          anno_nascita: string | null
          biografia: string | null
          cognome: string | null
          creato_da: string | null
          creato_il: string | null
          email_associata: string | null
          giorno_nascita: string | null
          id: string
          link_foto: string | null
          link_social: Json | null
          località: Json | null
          mese_nascita: string | null
          nascosto: boolean | null
          nome: string | null
          ruolo_principale: string | null
          sport: string | null
          tipologia_sport: string | null
          ultima_modifica_da: string | null
          ultima_modifica_il: string | null
          verificato: boolean | null
        }
        Insert: {
          anno_nascita?: string | null
          biografia?: string | null
          cognome?: string | null
          creato_da?: string | null
          creato_il?: string | null
          email_associata?: string | null
          giorno_nascita?: string | null
          id?: string
          link_foto?: string | null
          link_social?: Json | null
          località?: Json | null
          mese_nascita?: string | null
          nascosto?: boolean | null
          nome?: string | null
          ruolo_principale?: string | null
          sport?: string | null
          tipologia_sport?: string | null
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
          verificato?: boolean | null
        }
        Update: {
          anno_nascita?: string | null
          biografia?: string | null
          cognome?: string | null
          creato_da?: string | null
          creato_il?: string | null
          email_associata?: string | null
          giorno_nascita?: string | null
          id?: string
          link_foto?: string | null
          link_social?: Json | null
          località?: Json | null
          mese_nascita?: string | null
          nascosto?: boolean | null
          nome?: string | null
          ruolo_principale?: string | null
          sport?: string | null
          tipologia_sport?: string | null
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
          verificato?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
          {
            foreignKeyName: "Giocatore_email_associata_fkey"
            columns: ["email_associata"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
          {
            foreignKeyName: "ultima_modifica_da_fkey"
            columns: ["ultima_modifica_da"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
        ]
      }
      Ruolo_sport: {
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
            foreignKeyName: "creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
          {
            foreignKeyName: "Ruolo_sport_sport_fkey"
            columns: ["sport"]
            isOneToOne: false
            referencedRelation: "Sport"
            referencedColumns: ["nome"]
          },
          {
            foreignKeyName: "Ruolo_sport_ultima_modifica_da_fkey"
            columns: ["ultima_modifica_da"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
        ]
      }
      Sport: {
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
            foreignKeyName: "creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
          {
            foreignKeyName: "Sport_ultima_modifica_da_fkey"
            columns: ["ultima_modifica_da"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
        ]
      }
      Squadra: {
        Row: {
          creato_da: string | null
          creato_il: string | null
          descrizione: string | null
          email_associata: string | null
          id: string
          link_social: Json | null
          link_stemma: string | null
          nascosto: boolean | null
          nome: string | null
          sede_principale: string | null
          sport: string | null
          tipologia_sport: string | null
          ultima_modifica_da: string | null
          ultima_modifica_il: string | null
          verificato: boolean | null
        }
        Insert: {
          creato_da?: string | null
          creato_il?: string | null
          descrizione?: string | null
          email_associata?: string | null
          id?: string
          link_social?: Json | null
          link_stemma?: string | null
          nascosto?: boolean | null
          nome?: string | null
          sede_principale?: string | null
          sport?: string | null
          tipologia_sport?: string | null
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
          verificato?: boolean | null
        }
        Update: {
          creato_da?: string | null
          creato_il?: string | null
          descrizione?: string | null
          email_associata?: string | null
          id?: string
          link_social?: Json | null
          link_stemma?: string | null
          nascosto?: boolean | null
          nome?: string | null
          sede_principale?: string | null
          sport?: string | null
          tipologia_sport?: string | null
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
          verificato?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "squadra_creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
          {
            foreignKeyName: "squadra_email_associata_fkey"
            columns: ["email_associata"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
          {
            foreignKeyName: "squadra_ultima_modifica_da_fkey"
            columns: ["ultima_modifica_da"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
        ]
      }
      Staff: {
        Row: {
          anno_nascita: string | null
          biografia: string | null
          categoria_ricercata: string | null
          cognome: string | null
          creato_da: string | null
          creato_il: string | null
          email_associata: string | null
          figura_professionale: string | null
          giorno_nascita: string | null
          id: string
          link_foto: string | null
          link_social: Json | null
          lista_esperienze: Json | null
          località: Json | null
          mese_nascita: string | null
          nascosto: boolean | null
          nome: string | null
          sport: string | null
          spostamento: boolean | null
          tipologia_sport: string | null
          ultima_modifica_da: string | null
          ultima_modifica_il: string | null
          verificato: boolean | null
        }
        Insert: {
          anno_nascita?: string | null
          biografia?: string | null
          categoria_ricercata?: string | null
          cognome?: string | null
          creato_da?: string | null
          creato_il?: string | null
          email_associata?: string | null
          figura_professionale?: string | null
          giorno_nascita?: string | null
          id?: string
          link_foto?: string | null
          link_social?: Json | null
          lista_esperienze?: Json | null
          località?: Json | null
          mese_nascita?: string | null
          nascosto?: boolean | null
          nome?: string | null
          sport?: string | null
          spostamento?: boolean | null
          tipologia_sport?: string | null
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
          verificato?: boolean | null
        }
        Update: {
          anno_nascita?: string | null
          biografia?: string | null
          categoria_ricercata?: string | null
          cognome?: string | null
          creato_da?: string | null
          creato_il?: string | null
          email_associata?: string | null
          figura_professionale?: string | null
          giorno_nascita?: string | null
          id?: string
          link_foto?: string | null
          link_social?: Json | null
          lista_esperienze?: Json | null
          località?: Json | null
          mese_nascita?: string | null
          nascosto?: boolean | null
          nome?: string | null
          sport?: string | null
          spostamento?: boolean | null
          tipologia_sport?: string | null
          ultima_modifica_da?: string | null
          ultima_modifica_il?: string | null
          verificato?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
          {
            foreignKeyName: "staff_email_associata_fkey"
            columns: ["email_associata"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
          {
            foreignKeyName: "staff_figura_professionale_fkey"
            columns: ["figura_professionale"]
            isOneToOne: false
            referencedRelation: "Figura_professionale"
            referencedColumns: ["titolo"]
          },
          {
            foreignKeyName: "ultima_modifica_da_fkey"
            columns: ["ultima_modifica_da"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
        ]
      }
      Tipologia_sport: {
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
            foreignKeyName: "creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
          {
            foreignKeyName: "modificato_da_fkey"
            columns: ["ultima_modifica_da"]
            isOneToOne: false
            referencedRelation: "Utente"
            referencedColumns: ["indirizzo_email"]
          },
          {
            foreignKeyName: "Tipologia_sport_sport_fkey"
            columns: ["sport"]
            isOneToOne: false
            referencedRelation: "Sport"
            referencedColumns: ["nome"]
          },
        ]
      }
      Utente: {
        Row: {
          creato_il: string | null
          indirizzo_email: string
          tipologia_utente: Database["public"]["Enums"]["tipologia_utente"]
        }
        Insert: {
          creato_il?: string | null
          indirizzo_email: string
          tipologia_utente?: Database["public"]["Enums"]["tipologia_utente"]
        }
        Update: {
          creato_il?: string | null
          indirizzo_email?: string
          tipologia_utente?: Database["public"]["Enums"]["tipologia_utente"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      json_array_to_object: { Args: { _arr: Json[] }; Returns: Json }
      jsonb_array_to_object: { Args: { _arr: Json[] }; Returns: Json }
    }
    Enums: {
      tipologia_utente: "Normale" | "Moderatore" | "Admin"
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
    Enums: {
      tipologia_utente: ["Normale", "Moderatore", "Admin"],
    },
  },
} as const
