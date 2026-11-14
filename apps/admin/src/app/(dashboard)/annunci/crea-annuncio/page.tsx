import {requireAdminPageContext} from "@/features/dashboard/server/guard";
import {CreateAnnouncementPrototype} from "@/features/annunci/create/CreateAnnouncementPrototype";

export default async function CreaAnnuncioPage() {
  await requireAdminPageContext();
  return <section className="admin-page admin-create-page">
    <h1 className="admin-section-heading">Crea nuovo annuncio</h1>
    <CreateAnnouncementPrototype />
  </section>;
}
