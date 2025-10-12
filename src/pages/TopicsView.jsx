import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Subject, Topic } from '@/api/entities';
import TopicCard from '@/components/topics/TopicCard';
import AddTopicCard from '@/components/topics/AddTopicCard';
import TopicModal from '@/components/topics/TopicModal';
import pb from '@/api/pb';

const TopicsView = () => {
  const queryClient = useQueryClient();
  const [addModalOpenBySubject, setAddModalOpenBySubject] = useState({});

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => Subject.list({ 'class_id.user_id': pb.authStore.model.id }),
  });

  const handleAddTopic = (subjectId) => {
    setAddModalOpenBySubject(prev => ({ ...prev, [subjectId]: true }));
  };

  const handleCloseAddModal = (subjectId) => {
    setAddModalOpenBySubject(prev => ({ ...prev, [subjectId]: false }));
  };

  const handleSaveTopic = async (topicData, subjectId) => {
    const payload = {
      ...topicData,
      subject: subjectId,
      class_id: subjects.find(s => s.id === subjectId)?.class_id,
      school_year: new Date().getFullYear(),
      user_id: pb.authStore.model?.id || ''
    };
    try {
      let savedTopic;
      if (topicData.id) {
        savedTopic = await Topic.update(topicData.id, payload);
      } else {
        savedTopic = await Topic.create(payload);
      }
      handleCloseAddModal(subjectId);
      await queryClient.invalidateQueries({ queryKey: ['topics'] });
      return savedTopic; // Rückgabe des gespeicherten Themas
    } catch (error) {
      console.error('Error saving topic in TopicsView:', error);
      if (error.data?.data) {
        console.error('Validation errors:', error.data.data);
      }
      alert('Fehler beim Speichern des Themas: ' + (error.data?.message || 'Unbekannter Fehler'));
    }
  };

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">Themenansicht</h1>
      <div className="space-y-8">
        {subjects?.map((subject) => {
          const isAddModalOpen = addModalOpenBySubject[subject.id] || false;

          return (
            <div key={subject.id}>
              <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">{subject.name}</h2>
              <div className="mt-4 flex overflow-x-auto gap-4 pb-4">
                <SubjectTopics subjectId={subject.id} subjects={subjects} />
                <AddTopicCard onClick={() => handleAddTopic(subject.id)} />
              </div>
              <TopicModal
                isOpen={isAddModalOpen}
                onClose={() => handleCloseAddModal(subject.id)}
                onSave={(topicData) => handleSaveTopic(topicData, subject.id)}
                topic={null}
                subjectColor={subject.color}
                subject={subject}
                topics={subjects?.flatMap(s => s.topics || []) || []} // Übergabe aller Themen
                autoAssignTopicId={null} // Kein Thema für neue Themen
                onOpenChange={() => console.log('TopicsView: TopicModal opened with autoAssignTopicId =', topic ? topic.id : 'null')}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SubjectTopics = ({ subjectId, subjects }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const queryClient = useQueryClient();

  const { data: topics } = useQuery({
    queryKey: ['topics', subjectId],
    queryFn: () => Topic.list({ subject: subjectId }),
  });

  return (
    <>
      {topics?.map((topic) => (
        <TopicCard key={topic.id} topic={topic} onClick={() => { setSelectedTopic(topic); setIsModalOpen(true); }} />
      ))}
      <TopicModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={async (topicData) => {
          try {
            await Topic.update(topicData.id, topicData);
            setIsModalOpen(false);
            await queryClient.invalidateQueries({ queryKey: ['topics'] });
          } catch (error) {
            console.error('Error updating topic in SubjectTopics:', error);
            if (error.data?.data) {
              console.error('Validation errors:', error.data.data);
            }
            alert('Fehler beim Aktualisieren des Themas: ' + (error.data?.message || 'Unbekannter Fehler'));
          }
        }}
        onDelete={async (topicId) => {
          try {
            await Topic.delete(topicId);
            setIsModalOpen(false);
            await queryClient.invalidateQueries({ queryKey: ['topics'] });
          } catch (error) {
            console.error('Error deleting topic:', error);
            alert('Fehler beim Löschen des Themas: ' + (error.data?.message || 'Unbekannter Fehler'));
          }
        }}
        topic={selectedTopic}
        subjectId={subjectId}
        subject={selectedTopic ? subjects.find(s => s.id === selectedTopic.subject) : null}
        subjectColor={selectedTopic?.color || '#3b82f6'}
        topics={subjects?.flatMap(s => s.topics || []) || []} // Übergabe aller Themen
        autoAssignTopicId={selectedTopic?.id || null} // Setze autoAssignTopicId für bestehende Themen
      />
    </>
  );
};

export default TopicsView;