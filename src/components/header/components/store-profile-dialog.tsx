import {
  GetManagedStoreResponse,
  getManagedStore,
} from '@/api/get-managed-store'
import { Button } from '@/components/ui/button'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateProfile } from '@/api/update-profile'
import { toast } from 'sonner'

interface StoreProfileDialog {
  handleCloseModalDialog: () => void
}

export function StoreProfileDialog({
  handleCloseModalDialog,
}: StoreProfileDialog) {
  const queryClient = useQueryClient()
  const { data: managedStore } = useQuery({
    queryKey: ['managedStore'],
    queryFn: getManagedStore,
    staleTime: Infinity,
  })

  const storeProfileSchema = z.object({
    name: z.string(),
    description: z.string().nullable(),
  })

  type StoreProfileSchema = z.infer<typeof storeProfileSchema>

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<StoreProfileSchema>({
    resolver: zodResolver(storeProfileSchema),
    /* values no lugar de default pq os dados nao estao prontos qd o form e carregado. 
      enquanto q o resolver fica monitorando os valores ate ficar pronto   
    */
    values: {
      name: managedStore?.name ?? '',
      description: managedStore?.description ?? '',
    },
  })

  function updateManagedStoreCache({ name, description }: StoreProfileSchema) {
    // pega o cache do react-query e atualiza as infos sem precisar de refresh
    const cached = queryClient.getQueryData<GetManagedStoreResponse>([
      'managedStore',
    ])

    if (cached) {
      queryClient.setQueryData<GetManagedStoreResponse>(['managedStore'], {
        ...cached,
        name,
        description,
      })
    }

    return { cached } // informacoes antes das alteracoes
  }

  const { mutateAsync: updateProfileFn } = useMutation({
    mutationFn: updateProfile,
    /* interface otimista explicacao
      diferente do onSucess. o onMutate faz a alteracao instantaneamente, msm se der erro.
      Isso e valido pq nesse caso do profile, a chance de dar erro e quase nula.
      Porem se  por algum motivo der erro, o onError fica responsavel por retornar
      os dados p/ os valores antigos, atraves do cache.
    */
    onMutate({ name, description }) {
      const { cached } = updateManagedStoreCache({ name, description })
      return { previousProfile: cached }
    },
    onError(_, __, context) {
      if (context?.previousProfile) {
        updateManagedStoreCache(context.previousProfile)
      }
    },
  })

  async function updateManagedInfo(data: StoreProfileSchema) {
    try {
      await updateProfileFn({ name: data.name, description: data.description })
      handleCloseModalDialog()
      toast.success('Perfil atualizado com sucesso!')
    } catch (err) {
      toast.error('Houve um erro ao atualizar, nenhuma alteração foi feita.')
      handleCloseModalDialog()
      console.log('erro:', err as string)
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Perfil da loja</DialogTitle>
        <DialogDescription>
          Atualize as informações do seu estabelecimento{' '}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(updateManagedInfo)}>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-4 items-center">
            <Label htmlFor="storeName">Nome</Label>
            <Input
              id="storeName"
              className="col-span-3"
              {...register('name')}
            />
          </div>

          <div className="grid grid-cols-4 items-center">
            <Label htmlFor="storeDescription">Descrição</Label>
            <Textarea
              id="storeDescription"
              className="col-span-3"
              {...register('description')}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button disabled={isSubmitting} type="button" variant="ghost">
              Cancelar
            </Button>
          </DialogClose>
          <Button disabled={isSubmitting} type="submit" variant="success">
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
