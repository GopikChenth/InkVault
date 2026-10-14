import { FolderUp, GraduationCap, Folder } from 'lucide-react';
import EmptyState from '../../../components/EmptyState';

interface StudySubjectSetupCardProps {
  onTriggerImportFolder: () => void;
}

export default function StudySubjectSetupCard({
  onTriggerImportFolder,
}: StudySubjectSetupCardProps) {
  return (
    <EmptyState
      icon={GraduationCap}
      title="Import Subject Folder"
      description="Select a folder to organize your study documents."
      actionLabel="Select Folder from Computer"
      actionIcon={FolderUp}
      onAction={onTriggerImportFolder}
      hint="Or drag & drop a folder here"
      hintIcon={Folder}
    />
  );
}
