import { getContacts } from "@/app/actions/contacts"
import { ContactList } from "@/components/contacts/contact-list"


export const dynamic = 'force-dynamic'

export default async function ContactsPage() {
  const { contacts } = await getContacts()

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">Kelola daftar kontak WhatsApp Anda untuk mempermudah kampanye broadcast.</span>
          </div>
        </div>
      </div>


      <ContactList contacts={contacts as unknown as { $id: string; name: string; phone: string; tags: string; $createdAt: string }[]} />
    </div>
  )
}
