// imports from other namespaces
import NotificationActions from '/app/packs/src/components/actions/NotificationActions';

export default notification = props =>
(
  NotificationActions.add({
    title: props.title,
    message: props.msg,
    level: props.lvl,
    position: 'tc',
    dismissible: 'button',
    autoDismiss: props.autoDismiss || 5,
    uid: props.uid || uuid.v4()
  })
);
