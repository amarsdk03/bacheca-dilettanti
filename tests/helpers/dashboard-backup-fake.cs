// Synthetic executable used only by dashboard-backup.test.mjs. Never connects to a database.
using System;
using System.IO;
using System.Linq;
class BackupFake {
    static int Main(string[] args) {
        string bin = AppDomain.CurrentDomain.BaseDirectory;
        string name = Path.GetFileNameWithoutExtension(System.Diagnostics.Process.GetCurrentProcess().MainModule.FileName);
        if (args.Contains("--version")) { Console.WriteLine(name + " (PostgreSQL) 17.11"); return 0; }
        string mode = File.ReadAllText(Path.Combine(bin, "mode.txt")).Trim();
        File.AppendAllText(Path.Combine(bin, "trace.txt"), name + " " + string.Join("|", args) + "\n");
        string password = Environment.GetEnvironmentVariable("PGPASSWORD");
        if (name == "pg_restore") {
            if (password != null || args.Any(a => a.StartsWith("--dbname") || a == "-d")) return 88;
            if (args.Contains("--list")) {
                // Match PostgreSQL 17: public may have ACL/COMMENT but no CREATE entry.
                if (mode == "public-create") Console.WriteLine("1; 2615 1 SCHEMA - public pg_database_owner");
                if (mode != "public-no-acl") Console.WriteLine("5366; 0 0 ACL - SCHEMA public pg_database_owner\n5367; 0 0 COMMENT - SCHEMA public pg_database_owner");
                if (mode != "missing-schema") Console.WriteLine("2; 2615 2 SCHEMA - private postgres");
                Console.WriteLine("3; 2615 3 SCHEMA - auth supabase_admin\n4; 2615 4 SCHEMA - storage supabase_admin");
                string[] tables = { "public utente", "private admin_audit_event_v1", "auth users", "storage buckets", "storage objects" };
                foreach (string table in tables) {
                    if (mode != "missing-public-table" || table != "public utente") Console.WriteLine("5; 1259 5 TABLE " + table + " postgres");
                    if (mode != "missing-data" && (mode != "missing-public-data" || table != "public utente")) Console.WriteLine("6; 0 5 TABLE DATA " + table + " postgres");
                }
                return 0;
            }
            if (!args.Contains("--file=NUL")) return 89;
            return mode == "corrupt" ? 1 : 0;
        }
        if (password != "synthetic-only-\\\"-$()-secret" || Environment.GetEnvironmentVariable("PGUSER") != "postgres.nsytraextbndfyprwzts" || Environment.GetEnvironmentVariable("PGSERVICE") != null) return 87;
        if (mode == "auth-failed") { Console.Error.WriteLine("password authentication failed " + password); return 2; }
        if (name == "psql") {
            Console.WriteLine("{\"database\":\"postgres\",\"operator\":\"postgres\",\"version\":170006,\"ssl\":true,\"relations\":[{\"schema\":\"public\",\"name\":\"utente\"},{\"schema\":\"private\",\"name\":\"admin_audit_event_v1\"},{\"schema\":\"auth\",\"name\":\"users\"},{\"schema\":\"storage\",\"name\":\"buckets\"},{\"schema\":\"storage\",\"name\":\"objects\"}]}");
            return 0;
        }
        int fileArg = Array.IndexOf(args, "--file");
        if (fileArg < 0) return 86;
        File.WriteAllText(args[fileArg + 1], name == "pg_dump" ? "SYNTHETIC ARCHIVE" : "-- Synthetic roles; no passwords\nCREATE ROLE sample;");
        if (mode == "partial" && name == "pg_dump") { Console.Error.WriteLine("permission denied " + password); return 1; }
        if (mode == "roles-failed" && name == "pg_dumpall") return 1;
        if (mode == "warning" && name == "pg_dump") Console.Error.WriteLine("warning: synthetic omitted object " + password);
        if (mode == "empty" && name == "pg_dump") File.WriteAllText(args[fileArg + 1], "");
        return 0;
    }
}
