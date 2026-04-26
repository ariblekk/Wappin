"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Smartphone } from "lucide-react"
import { deleteAutoReply } from "@/app/actions/auto-reply"
import { toast } from "sonner"
import { AutoReplyForm } from "./auto-reply-form"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface AutoReply {
  $id: string
  keyword: string
  response: string
  type: "exact" | "contains"
  deviceId: string
  $createdAt: string
}

interface Device {
  $id: string
  name: string
  waName?: string
}

interface AutoReplyListProps {
  replies: AutoReply[]
  devices: Device[]
}

export function AutoReplyList({ replies: initialReplies, devices }: AutoReplyListProps) {
  const [replies, setReplies] = React.useState(initialReplies)
  const [prevInitialReplies, setPrevInitialReplies] = React.useState(initialReplies)

  if (initialReplies !== prevInitialReplies) {
    setPrevInitialReplies(initialReplies)
    setReplies(initialReplies)
  }

  React.useEffect(() => {
    const handleOptimistic = (e: Event) => {
      const customEvent = e as CustomEvent<{ action: string, data: AutoReply }>
      const { action, data } = customEvent.detail
      
      if (action === 'create') {
        setReplies(prev => [data, ...prev])
      } else if (action === 'update') {
        setReplies(prev => prev.map(r => r.$id === data.$id ? data : r))
      }
    }
    
    window.addEventListener('optimistic-autoreply', handleOptimistic)
    return () => window.removeEventListener('optimistic-autoreply', handleOptimistic)
  }, [])

  async function handleDelete(id: string) {
    // Optimistic delete
    setReplies(prev => prev.filter(r => r.$id !== id))
    
    const res = await deleteAutoReply(id)
    if (res.success) {
      toast.success("Aturan dihapus")
    } else {
      toast.error(res.error || "Gagal menghapus")
      setReplies(initialReplies) // Revert if failed
    }
  }

  function getDeviceName(id: string) {
    const device = devices.find(d => d.$id === id)
    return device ? (device.waName || device.name) : "Unknown Device"
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Perangkat</TableHead>
            <TableHead>Kata Kunci</TableHead>
            <TableHead>Tipe</TableHead>
            <TableHead>Pesan Balasan</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {replies.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                Belum ada aturan auto reply.
              </TableCell>
            </TableRow>
          ) : (
            replies.map((reply) => (
              <TableRow key={reply.$id}>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm">
                    <Smartphone className="size-3.5 text-muted-foreground" />
                    <span className="truncate max-w-[120px]">{getDeviceName(reply.deviceId)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs font-bold">
                    {reply.keyword}
                  </code>
                </TableCell>
                <TableCell>
                  <Badge variant={reply.type === 'exact' ? "default" : "secondary"} className="text-[10px]">
                    {reply.type === 'exact' ? 'Exact' : 'Contains'}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <p className="truncate text-sm text-muted-foreground italic">
                    &quot;{reply.response}&quot;
                  </p>
                </TableCell>
                <TableCell className="text-right flex items-center justify-end gap-1">
                  <AutoReplyForm devices={devices} mode="edit" initialData={reply} />
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Auto Reply?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Aturan untuk kata kunci <strong>{reply.keyword}</strong> akan dihapus permanen.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDelete(reply.$id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
