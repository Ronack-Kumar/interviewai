import RoomClient from './RoomClient';

export const metadata = {
  title: 'Room | MockPrep',
  description: 'Peer interview room',
};

export default function RoomPage({ params }) {
  return <RoomClient roomCode={params.roomId} />;
}
