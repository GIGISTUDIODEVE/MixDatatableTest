using System;
using UnityEngine;

namespace GIGISTUDIO.Runtime
{
    /// <summary>
    /// HP 보유 + Damage/Heal 적용 + Death 이벤트
    /// - 현재 HP는 0~MaxHP로 클램프
    /// - Death는 1회만 발생
    /// </summary>
    public sealed class HealthComponent : MonoBehaviour
    {
        [SerializeField] private float maxHp = 100f;
        [SerializeField] private float currentHp = 100f;
        [SerializeField] private bool isDead;

        public float MaxHP => maxHp;
        public float CurrentHP => currentHp;
        public bool IsDead => isDead;

        public event Action<HealthComponent> OnDeath;
        public event Action<float, float> OnHpChanged; // (current, max)

        public void SetMaxHP(float value, bool refill = false)
        {
            maxHp = Mathf.Max(1f, value);
            if (refill) currentHp = maxHp;
            ClampAndNotify();
        }

        public void SetHP(float value)
        {
            currentHp = value;
            ClampAndNotify();
        }

        public void ApplyDamage(float amount)
        {
            if (isDead) return;
            amount = Mathf.Max(0f, amount);
            if (amount <= 0f) return;

            currentHp -= amount;
            ClampAndNotify();

            if (!isDead && currentHp <= 0f)
            {
                isDead = true;
                currentHp = 0f;
                OnHpChanged?.Invoke(currentHp, maxHp);
                OnDeath?.Invoke(this);
            }
        }

        public void ApplyHeal(float amount)
        {
            if (isDead) return;
            amount = Mathf.Max(0f, amount);
            if (amount <= 0f) return;

            currentHp += amount;
            ClampAndNotify();
        }

        private void ClampAndNotify()
        {
            maxHp = Mathf.Max(1f, maxHp);
            currentHp = Mathf.Clamp(currentHp, 0f, maxHp);
            OnHpChanged?.Invoke(currentHp, maxHp);
        }
    }
}
