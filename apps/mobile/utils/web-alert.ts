import { Alert, Platform, type AlertButton } from 'react-native';

/*
 * =========================================================
 * Alert.alert ON WEB (Admin portal)
 * =========================================================
 *
 * react-native-web's Alert.alert does nothing, so confirm
 * dialogs (approve, mark paid, apply penalty...) would never
 * run their onPress. This maps Alert.alert to the browser's
 * alert / confirm dialogs.
 * =========================================================
 */
export const installWebAlert = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const list = buttons && buttons.length ? buttons : [{ text: 'OK' }];

    if (list.length === 1) {
      window.alert(text);
      list[0].onPress?.();
      return;
    }

    const cancel = list.find(button => button.style === 'cancel');
    const actions = list.filter(button => button !== cancel);

    if (actions.length === 1) {
      if (window.confirm(`${text}\n\nOK = ${actions[0].text ?? 'Continue'}`)) {
        actions[0].onPress?.();
      } else {
        cancel?.onPress?.();
      }
      return;
    }

    const choice = window.prompt(
      `${text}\n\n${actions.map((button, index) => `${index + 1}. ${button.text ?? 'Option'}`).join('\n')}\n\nType a number (leave empty to cancel):`
    );
    const index = Number(choice) - 1;

    if (Number.isInteger(index) && actions[index]) {
      actions[index].onPress?.();
    } else {
      cancel?.onPress?.();
    }
  };
};
