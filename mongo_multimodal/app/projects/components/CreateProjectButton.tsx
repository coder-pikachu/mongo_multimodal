'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { Button, Input, Textarea, Modal } from '@/components/ui';

const projectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
});

type ProjectFormData = z.infer<typeof projectSchema>;

export default function CreateProjectButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
  });

  const onSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to create project');

      const result = await response.json();
      setIsOpen(false);
      reset();
      router.push(`/projects/${result.id}`);
      router.refresh();
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setIsOpen(false);
      reset();
    }
  };

  return (
    <>
      <Button
        variant="primary"
        size="lg"
        leftIcon={<Plus className="h-5 w-5" />}
        onClick={() => setIsOpen(true)}
      >
        Create Project
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Create New Project"
        description="Start a new project to organize your research and documents."
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit(onSubmit)}
              isLoading={isSubmitting}
            >
              Create Project
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Project Name"
            placeholder="Enter a descriptive name"
            error={errors.name?.message}
            fullWidth
            {...register('name')}
          />

          <Textarea
            label="Description"
            placeholder="What is this project about?"
            rows={4}
            error={errors.description?.message}
            fullWidth
            {...register('description')}
          />
        </form>
      </Modal>
    </>
  );
}
